import { randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'
import { gradeAttempt } from '@engine/exam/grade'
import type {
  Attempt,
  AttemptExam,
  AttemptProgress,
  AttemptSummary,
  ExamQuestion,
  QuestionState
} from '@shared/exam'

// Exam attempts in one SQLite file (cert-practice.db in the userData folder). The schema is in
// CLAUDE.md (Data storage). Exercise results are never stored. Each migration raises user_version.

const MIGRATIONS = [
  `CREATE TABLE attempts (
     id TEXT PRIMARY KEY,
     exam_id TEXT NOT NULL,
     seed INTEGER NOT NULL,
     status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed')),
     config_snapshot TEXT NOT NULL,
     question_count INTEGER NOT NULL,
     time_limit_s INTEGER NOT NULL,
     time_left_s INTEGER NOT NULL,
     current_index INTEGER NOT NULL DEFAULT 0,
     started_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     completed_at TEXT,
     points REAL,
     score INTEGER,
     passed INTEGER,
     correct INTEGER,
     time_used_s INTEGER
   );
   CREATE INDEX attempts_exam ON attempts (exam_id, status);
   CREATE TABLE attempt_questions (
     attempt_id TEXT NOT NULL REFERENCES attempts (id) ON DELETE CASCADE,
     position INTEGER NOT NULL,
     source_id TEXT NOT NULL,
     origin TEXT NOT NULL,
     kind TEXT,
     type TEXT NOT NULL,
     structure TEXT NOT NULL,
     qualifier TEXT,
     domain_id TEXT NOT NULL,
     objectives TEXT NOT NULL,
     topics TEXT NOT NULL,
     stem TEXT NOT NULL,
     options TEXT NOT NULL,
     answer TEXT NOT NULL,
     select_count INTEGER NOT NULL,
     explanation TEXT NOT NULL,
     why_wrong TEXT NOT NULL,
     selected TEXT,
     flagged INTEGER NOT NULL DEFAULT 0,
     struck TEXT NOT NULL,
     seconds INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (attempt_id, position)
   );
   CREATE INDEX attempt_questions_source ON attempt_questions (source_id);`
]

interface AttemptRow {
  id: string
  exam_id: string
  seed: number
  status: 'in_progress' | 'completed'
  config_snapshot: string
  question_count: number
  time_limit_s: number
  time_left_s: number
  current_index: number
  started_at: string
  updated_at: string
  completed_at: string | null
  points: number | null
  score: number | null
  passed: number | null
  correct: number | null
  time_used_s: number | null
}

interface QuestionRow {
  source_id: string
  origin: ExamQuestion['origin']
  kind: ExamQuestion['kind']
  type: ExamQuestion['type']
  structure: ExamQuestion['structure']
  qualifier: ExamQuestion['qualifier']
  domain_id: string
  objectives: string
  topics: string
  stem: string
  options: string
  answer: string
  select_count: number
  explanation: string
  why_wrong: string
  selected: string | null
  flagged: number
  struck: string
  seconds: number
}

export interface NewAttempt {
  exam: AttemptExam
  seed: number
  timeLimitS: number
  questions: ExamQuestion[]
}

const SUMMARY = `
  SELECT a.*,
    (SELECT COUNT(*) FROM attempt_questions q WHERE q.attempt_id = a.id AND q.selected IS NOT NULL) AS answered,
    (SELECT COUNT(*) FROM attempt_questions q WHERE q.attempt_id = a.id AND q.flagged = 1) AS flagged_count,
    (SELECT COUNT(*) FROM attempt_questions q WHERE q.attempt_id = a.id) AS total
  FROM attempts a`

export class AttemptStore {
  private readonly db: Database.Database

  /** `file` is the database path, or ":memory:" for tests. */
  constructor(
    file: string,
    private readonly now: () => Date = () => new Date()
  ) {
    this.db = new Database(file)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.migrate()
  }

  close(): void {
    this.db.close()
  }

  private migrate(): void {
    const version = this.db.pragma('user_version', { simple: true }) as number
    for (let v = version; v < MIGRATIONS.length; v++) {
      this.db.transaction(() => {
        this.db.exec(MIGRATIONS[v]!)
        this.db.pragma(`user_version = ${v + 1}`)
      })()
    }
  }

  /** Starts an attempt. An exam has one attempt in progress at most, so an older one is deleted. */
  create({ exam, seed, timeLimitS, questions }: NewAttempt): Attempt {
    const id = randomUUID()
    const at = this.now().toISOString()
    const insertQuestion = this.db.prepare(
      `INSERT INTO attempt_questions (attempt_id, position, source_id, origin, kind, type, structure, qualifier,
         domain_id, objectives, topics, stem, options, answer, select_count, explanation, why_wrong, struck)
       VALUES (@attempt_id, @position, @source_id, @origin, @kind, @type, @structure, @qualifier,
         @domain_id, @objectives, @topics, @stem, @options, @answer, @select_count, @explanation, @why_wrong, @struck)`
    )
    this.db.transaction(() => {
      this.db.prepare(`DELETE FROM attempts WHERE exam_id = ? AND status = 'in_progress'`).run(exam.id)
      this.db
        .prepare(
          `INSERT INTO attempts (id, exam_id, seed, status, config_snapshot, question_count, time_limit_s, time_left_s,
             started_at, updated_at) VALUES (?, ?, ?, 'in_progress', ?, ?, ?, ?, ?, ?)`
        )
        .run(id, exam.id, seed, JSON.stringify(exam), questions.length, timeLimitS, timeLimitS, at, at)
      questions.forEach((q, position) =>
        insertQuestion.run({
          attempt_id: id,
          position,
          source_id: q.sourceId,
          origin: q.origin,
          kind: q.kind,
          type: q.type,
          structure: q.structure,
          qualifier: q.qualifier,
          domain_id: q.domain,
          objectives: JSON.stringify(q.objectives),
          topics: JSON.stringify(q.topics),
          stem: q.stem,
          options: JSON.stringify(q.options),
          answer: JSON.stringify(q.answer),
          select_count: q.selectCount,
          explanation: q.explanation,
          why_wrong: JSON.stringify(q.whyWrong),
          struck: JSON.stringify(q.options.map(() => false))
        })
      )
    })()
    return this.get(id)!
  }

  /** Autosave: the remaining time, the current question, and the work on each question. */
  save(id: string, progress: AttemptProgress): void {
    const row = this.row(id)
    if (!row) throw new Error(`no attempt ${id}`)
    if (row.status !== 'in_progress') throw new Error('a completed attempt cannot change')
    const update = this.db.prepare(
      `UPDATE attempt_questions SET selected = ?, flagged = ?, struck = ?, seconds = ? WHERE attempt_id = ? AND position = ?`
    )
    this.db.transaction(() => {
      this.db
        .prepare(`UPDATE attempts SET time_left_s = ?, current_index = ?, updated_at = ? WHERE id = ?`)
        .run(
          clamp(progress.timeLeftS, 0, row.time_limit_s),
          clamp(progress.currentIndex, 0, row.question_count - 1),
          this.now().toISOString(),
          id
        )
      progress.states
        .slice(0, row.question_count)
        .forEach((s, position) =>
          update.run(
            s.selected ? JSON.stringify([...s.selected].sort((a, b) => a - b)) : null,
            s.flagged ? 1 : 0,
            JSON.stringify(s.struck),
            Math.max(0, Math.round(s.seconds)),
            id,
            position
          )
        )
    })()
  }

  /** Saves the last progress, grades the attempt, and marks it completed. */
  finish(id: string, progress: AttemptProgress): Attempt {
    this.save(id, progress)
    const attempt = this.get(id)!
    const result = gradeAttempt(
      attempt.exam,
      attempt.questions,
      attempt.states,
      attempt.timeLimitS - attempt.timeLeftS
    )
    this.db
      .prepare(
        `UPDATE attempts SET status = 'completed', completed_at = ?, points = ?, score = ?, passed = ?, correct = ?,
           time_used_s = ? WHERE id = ?`
      )
      .run(
        this.now().toISOString(),
        result.points,
        result.score,
        result.passed ? 1 : 0,
        result.correct,
        result.timeUsedS,
        id
      )
    return this.get(id)!
  }

  /** Deletes an attempt ("Cancel attempt" and Discard). */
  discard(id: string): void {
    this.db.prepare('DELETE FROM attempts WHERE id = ?').run(id)
  }

  get(id: string): Attempt | null {
    const row = this.row(id)
    if (!row) return null
    const rows = this.db
      .prepare('SELECT * FROM attempt_questions WHERE attempt_id = ? ORDER BY position')
      .all(id) as QuestionRow[]
    const exam = JSON.parse(row.config_snapshot) as AttemptExam
    const questions: ExamQuestion[] = rows.map((r) => ({
      sourceId: r.source_id,
      origin: r.origin,
      kind: r.kind,
      type: r.type,
      structure: r.structure,
      qualifier: r.qualifier,
      domain: r.domain_id,
      objectives: JSON.parse(r.objectives) as string[],
      topics: JSON.parse(r.topics) as string[],
      stem: r.stem,
      options: JSON.parse(r.options) as string[],
      answer: JSON.parse(r.answer) as number[],
      selectCount: r.select_count,
      explanation: r.explanation,
      whyWrong: JSON.parse(r.why_wrong) as (string | null)[]
    }))
    const states: QuestionState[] = rows.map((r) => ({
      selected: r.selected ? (JSON.parse(r.selected) as number[]) : null,
      flagged: r.flagged === 1,
      struck: JSON.parse(r.struck) as boolean[],
      seconds: r.seconds
    }))
    return {
      id: row.id,
      exam,
      seed: row.seed,
      status: row.status,
      timeLimitS: row.time_limit_s,
      timeLeftS: row.time_left_s,
      currentIndex: row.current_index,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      questions,
      states,
      result: row.status === 'completed' ? gradeAttempt(exam, questions, states, row.time_used_s ?? 0) : null
    }
  }

  /** Completed attempts, newest first. */
  completed(): AttemptSummary[] {
    return this.summaries(`WHERE a.status = 'completed' ORDER BY a.completed_at DESC`)
  }

  /** Attempts in progress (saved for later or interrupted), newest first. */
  inProgress(): AttemptSummary[] {
    return this.summaries(`WHERE a.status = 'in_progress' ORDER BY a.updated_at DESC`)
  }

  /** How often each pool question or scenario record was asked in this exam's completed attempts. */
  seenCounts(examId: string): Map<string, number> {
    const rows = this.db
      .prepare(
        `SELECT q.source_id AS id, COUNT(*) AS n FROM attempt_questions q JOIN attempts a ON a.id = q.attempt_id
         WHERE a.exam_id = ? AND a.status = 'completed' GROUP BY q.source_id`
      )
      .all(examId) as { id: string; n: number }[]
    return new Map(rows.map((r) => [r.id, r.n]))
  }

  private row(id: string): AttemptRow | undefined {
    return this.db.prepare('SELECT * FROM attempts WHERE id = ?').get(id) as AttemptRow | undefined
  }

  private summaries(where: string): AttemptSummary[] {
    const rows = this.db.prepare(`${SUMMARY} ${where}`).all() as (AttemptRow & {
      answered: number
      flagged_count: number
    })[]
    return rows.map((r) => {
      const exam = JSON.parse(r.config_snapshot) as AttemptExam
      return {
        id: r.id,
        examId: r.exam_id,
        examName: exam.name,
        status: r.status,
        startedAt: r.started_at,
        updatedAt: r.updated_at,
        completedAt: r.completed_at,
        questionCount: r.question_count,
        answered: r.answered,
        flagged: r.flagged_count,
        currentIndex: r.current_index,
        timeLeftS: r.time_left_s,
        passingScore: exam.passingScore,
        maxScore: exam.maxScore,
        score: r.score,
        passed: r.passed === null ? null : r.passed === 1,
        correct: r.correct,
        timeUsedS: r.time_used_s
      }
    })
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)))
}
