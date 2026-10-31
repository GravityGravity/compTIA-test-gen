# CompTIA Exam Overviews

This file gives the structure of each CompTIA exam in the app. Each part is for one exam.

| Part | Exam | Code | Status in the app |
|---|---|---|---|
| 1 | A+ Core 1 | 220-1201 | Current. Active since 2026-10-30. |
| 2 | A+ Core 2 | 220-1202 | Current |
| 3 | Network+ | N10-009 | Current. Active since 2026-10-30. |
| 4 | Security+ | SY0-801 | In scope. Active since 2026-10-30 (all five domains have content). |

**A+:** The current exams are **Core 1 (220-1201)** and **Core 2 (220-1202)**, version V15. You must pass the two exams to get the A+ certification. You must take the two exams from the same version.

**Network+:** One exam, **N10-009**, version V9.

**Security+:** One exam, **SY0-801**, version V8 (objectives document version 2.0). The books in `sources/sec/` are for the previous exam, SY0-701 (see Part 4, "Sources for this exam").

**Note:** The examples in this file are not real exam questions. They show the structure only.

---

# Part 1: Core 1 (220-1201)

## Exam Details

| Item | Value |
|---|---|
| Number of questions | Maximum of 90 |
| Time | 90 minutes |
| Passing score | 675 on a scale of 900 |
| Question format | Multiple choice (single response and multiple response) |

## Topics

| Domain | Weight |
|---|---|
| Mobile devices | 13% |
| Networking | 23% |
| Hardware | 25% |
| Virtualization and cloud computing | 11% |
| Hardware and network troubleshooting | 28% |

## Expected Number of Each Question Structure

CompTIA does not publish the number of questions for each structure. The numbers below are estimates. See "How the Estimates Were Calculated" at the end of this guide.

| Structure | Objectives (of 27) | Estimated questions (of 90) |
|---|---|---|
| Scenario-based ("Given a scenario…") | 13 | About 47 (52%) |
| Knowledge (Explain, Compare and contrast, Summarize) | 14 | About 43 (48%) |

Where the scenario questions come from:
- **Hardware and network troubleshooting:** all 6 objectives are scenario-based (largest source).
- **Hardware:** 4 of 8 objectives (motherboards, power supplies, printers).
- **Mobile devices:** 2 of 3 objectives.
- **Networking:** 1 of 8 objectives (SOHO network setup). Most networking questions are knowledge questions (ports, protocols, devices, tools).
- **Virtualization and cloud computing:** 0 of 2 objectives. All questions are knowledge questions.

Qualifier words (BEST, FIRST, MOST LIKELY) and multiple-response questions can occur in the two groups. No source gives a count for these.

## Objectives

| Objective | Structure |
|---|---|
| 1.1 Given a scenario, monitor mobile device hardware and use appropriate replacement techniques | Scenario |
| 1.2 Compare and contrast accessories and connectivity options for mobile devices | Knowledge |
| 1.3 Given a scenario, configure basic mobile device network connectivity and provide application support | Scenario |
| 2.1 Compare and contrast Transmission Control Protocol (TCP) and User Datagram Protocol (UDP) ports, protocols, and their purposes | Knowledge |
| 2.2 Explain wireless networking technologies | Knowledge |
| 2.3 Summarize services provided by networked hosts | Knowledge |
| 2.4 Explain common network configuration concepts | Knowledge |
| 2.5 Compare and contrast common networking hardware devices | Knowledge |
| 2.6 Given a scenario, configure basic wired/wireless small office/home office (SOHO) networks | Scenario |
| 2.7 Compare and contrast internet connection types, network types, and their characteristics | Knowledge |
| 2.8 Explain networking tools and their purposes | Knowledge |
| 3.1 Compare and contrast display components and attributes | Knowledge |
| 3.2 Summarize basic cable types and their connectors, features, and purposes | Knowledge |
| 3.3 Compare and contrast RAM characteristics | Knowledge |
| 3.4 Compare and contrast storage devices | Knowledge |
| 3.5 Given a scenario, install and configure motherboards, central processing units (CPUs), and add-on cards | Scenario |
| 3.6 Given a scenario, install the appropriate power supply | Scenario |
| 3.7 Given a scenario, deploy and configure multifunction devices/printers and settings | Scenario |
| 3.8 Given a scenario, perform appropriate printer maintenance | Scenario |
| 4.1 Explain virtualization concepts | Knowledge |
| 4.2 Summarize cloud computing concepts | Knowledge |
| 5.1 Given a scenario, troubleshoot motherboards, RAM, CPUs, and power | Scenario |
| 5.2 Given a scenario, troubleshoot drive and RAID issues | Scenario |
| 5.3 Given a scenario, troubleshoot video, projector, and display issues | Scenario |
| 5.4 Given a scenario, troubleshoot common mobile device issues | Scenario |
| 5.5 Given a scenario, troubleshoot network issues | Scenario |
| 5.6 Given a scenario, troubleshoot printer issues | Scenario |

## Question Structures

### 1. Scenario-based

The question tells you about a user, a device, and a problem. You must find the cause or the solution.

> *Example:* A user says that a laptop screen is very dim. The user can see an image when a flashlight points at the screen. What is the MOST LIKELY cause?

### 2. Qualifier words (BEST, FIRST, MOST LIKELY, LEAST)

Two or more answers can be correct. Only one answer is the best for the conditions in the question.

> *Example:* A technician smells burning plastic from a desktop PC. What should the technician do FIRST?

Tip: Safety comes first. The simplest and most probable cause usually comes before an expensive repair. For example, "replace the motherboard" is almost never the first step.

### 3. Definition and recall

These questions test facts: ports, protocols, cable types, and connectors.

> *Example:* Which port does Remote Desktop Protocol (RDP) use by default?

### 4. Select the correct item (tool, component, or setting)

The question gives a requirement. You must select the correct hardware, tool, or configuration.

> *Example:* A user needs fault tolerance and the best performance with four drives. Which RAID level should the technician use?

> *Example:* A technician must find which wall jack connects to which port on a patch panel. Which tool should the technician use?

### 5. Multiple response

The question tells you the number of answers to select. You must select all the correct answers.

> *Example:* Which TWO cloud models give the user the most control over the operating system? (Choose two.)

---

# Part 2: Core 2 (220-1202)

## Exam Details

| Item | Value |
|---|---|
| Number of questions | Maximum of 90 |
| Time | 90 minutes |
| Passing score | 700 on a scale of 900 |
| Question format | Multiple choice (single response and multiple response) |

## Topics

| Domain | Weight |
|---|---|
| Operating systems | 28% |
| Security | 28% |
| Software troubleshooting | 23% |
| Operational procedures | 21% |

## Expected Number of Each Question Structure

CompTIA does not publish the number of questions for each structure. The numbers below are estimates. See "How the Estimates Were Calculated" at the end of this guide.

| Structure | Objectives (of 36) | Estimated questions (of 90) |
|---|---|---|
| Scenario-based ("Given a scenario…") | 23 | About 62 (69%) |
| Knowledge (Explain, Compare and contrast, Summarize, Identify) | 13 | About 28 (31%) |

Where the scenario questions come from:
- **Software troubleshooting:** all 4 objectives are scenario-based.
- **Operating systems:** 7 of 11 objectives (Windows tools, commands, settings, networking, application installation).
- **Security:** 6 of 11 objectives (Windows security settings, malware removal, workstation hardening, mobile devices, SOHO networks, browsers).
- **Operational procedures:** 6 of 10 objectives (documentation, change management, backup, safety, communication, remote access).

Core 2 has more scenario questions than Core 1.

Qualifier words (BEST, FIRST, MOST LIKELY) and multiple-response questions can occur in the two groups. No source gives a count for these.

## Objectives

| Objective | Structure |
|---|---|
| 1.1 Explain common operating system (OS) types and their purposes | Knowledge |
| 1.2 Given a scenario, perform OS installations and upgrades in a diverse environment | Scenario |
| 1.3 Compare and contrast basic features of Microsoft Windows editions | Knowledge |
| 1.4 Given a scenario, use Microsoft Windows operating system features and tools | Scenario |
| 1.5 Given a scenario, use the appropriate Microsoft command-line tools | Scenario |
| 1.6 Given a scenario, configure Microsoft Windows settings | Scenario |
| 1.7 Given a scenario, configure Microsoft Windows networking features on a client/desktop | Scenario |
| 1.8 Explain common features and tools of the macOS/desktop operating system | Knowledge |
| 1.9 Identify common features and tools of the Linux client/desktop operating system | Knowledge |
| 1.10 Given a scenario, install applications according to requirements | Scenario |
| 1.11 Given a scenario, install and configure cloud-based productivity tools | Scenario |
| 2.1 Summarize various security measures and their purposes | Knowledge |
| 2.2 Given a scenario, configure and apply basic Microsoft Windows OS security settings | Scenario |
| 2.3 Compare and contrast wireless security protocols and authentication methods | Knowledge |
| 2.4 Summarize types of malware and tools/methods for detection, removal, and prevention | Knowledge |
| 2.5 Compare and contrast common social engineering attacks, threats, and vulnerabilities | Knowledge |
| 2.6 Given a scenario, implement procedures for basic small office/home office (SOHO) malware removal | Scenario |
| 2.7 Given a scenario, apply workstation security options and hardening techniques | Scenario |
| 2.8 Given a scenario, apply common methods for securing mobile devices | Scenario |
| 2.9 Compare and contrast common data destruction and disposal methods | Knowledge |
| 2.10 Given a scenario, apply security settings on SOHO wireless and wired networks | Scenario |
| 2.11 Given a scenario, configure relevant security settings in a browser | Scenario |
| 3.1 Given a scenario, troubleshoot common Windows OS issues | Scenario |
| 3.2 Given a scenario, troubleshoot common mobile OS and application issues | Scenario |
| 3.3 Given a scenario, troubleshoot common mobile OS and application security issues | Scenario |
| 3.4 Given a scenario, troubleshoot common personal computer (PC) security issues | Scenario |
| 4.1 Given a scenario, implement best practices associated with documentation and support systems information management | Scenario |
| 4.2 Given a scenario, apply change management procedures | Scenario |
| 4.3 Given a scenario, implement workstation backup and recovery methods | Scenario |
| 4.4 Given a scenario, use common safety procedures | Scenario |
| 4.5 Summarize environmental impacts and local environment controls | Knowledge |
| 4.6 Explain the importance of prohibited content/activity and privacy, licensing, and policy concepts | Knowledge |
| 4.7 Given a scenario, use proper communication techniques and professionalism | Scenario |
| 4.8 Explain the basics of scripting | Knowledge |
| 4.9 Given a scenario, use remote access technologies | Scenario |
| 4.10 Explain basic concepts related to artificial intelligence (AI) | Knowledge |

## Question Structures

### 1. Scenario-based

Many questions describe a user problem or a security incident. You must find the cause or the solution.

> *Example:* A user says that the browser opens pop-up windows and the home page changed. What is the MOST LIKELY cause?

### 2. Qualifier words (BEST, FIRST, MOST LIKELY, LEAST)

Two or more answers can be correct. Only one answer is the best for the conditions in the question.

> *Example:* A technician confirms that a PC has malware. What should the technician do FIRST?

### 3. Process and procedure steps

These questions ask about the correct step in a procedure, for example malware removal, change management, or backup.

> *Example:* A technician has removed malware from a PC. What is the NEXT step?

### 4. Definition and recall

These questions test facts: commands, tools, file systems, and security terms.

> *Example:* Which Windows command shows the IP configuration of a PC?

### 5. Select the correct item (tool, setting, or method)

The question gives a requirement. You must select the correct tool, setting, or method.

> *Example:* A company wants to encrypt all the data on Windows laptops. Which feature should the technician use?

> *Example:* A user must keep a full backup and only back up changes each day. Which backup type uses the least storage?

### 6. Multiple response

The question tells you the number of answers to select. You must select all the correct answers.

> *Example:* Which TWO of these are signs of a phishing email? (Choose two.)

**Note:** The V15 Core 1 objectives say that the troubleshooting methodology steps are not tested on the exam.

---

# Part 3: Network+ (N10-009)

**Status:** In scope (approved 2026-10-30). Active since 2026-10-30 (all five domains have content).

## Exam Details

| Item | Value |
|---|---|
| Number of questions | Maximum of 90 |
| Time | 90 minutes |
| Passing score | 720 on a scale of 100–900 |
| Question format | Multiple choice and performance-based questions (PBQs) |
| Launch date | June 20, 2024 |
| Recommended experience | CompTIA A+ and 9–12 months of hands-on experience as a junior network administrator or network support technician |

**Note:** PBQs are out of scope for the app now. A Network+ exam in the app uses multiple-choice questions only. Each attempt has 75–90 questions, the same range as A+ (approved 2026-10-30).

## Topics

| Domain | Weight |
|---|---|
| Networking concepts | 23% |
| Network implementation | 20% |
| Network operations | 19% |
| Network security | 14% |
| Network troubleshooting | 24% |

## Expected Number of Each Question Structure

CompTIA does not publish the number of questions for each structure. The numbers below are estimates. See "How the Estimates Were Calculated" at the end of this file.

| Structure | Objectives (of 25) | Estimated questions (of 90) |
|---|---|---|
| Scenario-based ("Given a scenario…") | 10 | About 40 (44%) |
| Knowledge (Explain, Compare and contrast, Summarize) | 15 | About 50 (56%) |

Where the scenario questions come from:
- **Network troubleshooting:** 4 of 5 objectives (cabling and interfaces, network services, performance, tools and protocols). Largest source.
- **Network implementation:** 2 of 4 objectives (switching, wireless).
- **Network operations:** 2 of 5 objectives (monitoring, IPv4 and IPv6 network services).
- **Network security:** 1 of 3 objectives (security features and defenses).
- **Networking concepts:** 1 of 8 objectives (IPv4 addressing). Most questions are knowledge questions (OSI model, appliances, cloud, ports and protocols, media, topologies).

Network+ has fewer scenario questions than the two A+ exams.

Qualifier words (BEST, FIRST, MOST LIKELY) and multiple-response questions can occur in the two groups. No source gives a count for these.

## Objectives

| Objective | Structure |
|---|---|
| 1.1 Explain concepts related to the OSI reference model | Knowledge |
| 1.2 Compare and contrast networking appliances, applications, and functions | Knowledge |
| 1.3 Summarize cloud concepts and connectivity options | Knowledge |
| 1.4 Explain common networking ports, protocols, services, and traffic types | Knowledge |
| 1.5 Compare and contrast transmission media and transceivers | Knowledge |
| 1.6 Compare and contrast network topologies, architectures, and types | Knowledge |
| 1.7 Given a scenario, use appropriate IPv4 network addressing | Scenario |
| 1.8 Summarize evolving use cases for modern network environments | Knowledge |
| 2.1 Explain characteristics of routing technologies | Knowledge |
| 2.2 Given a scenario, configure switching technologies and features | Scenario |
| 2.3 Given a scenario, select and configure wireless devices and technologies | Scenario |
| 2.4 Explain important factors of physical installations | Knowledge |
| 3.1 Explain the purpose of organizational processes and procedures | Knowledge |
| 3.2 Given a scenario, use network monitoring technologies | Scenario |
| 3.3 Explain disaster recovery (DR) concepts | Knowledge |
| 3.4 Given a scenario, implement IPv4 and IPv6 network services | Scenario |
| 3.5 Compare and contrast network access and management methods | Knowledge |
| 4.1 Explain the importance of basic network security concepts | Knowledge |
| 4.2 Summarize various types of attacks and their impact to the network | Knowledge |
| 4.3 Given a scenario, apply network security features, defense techniques, and solutions | Scenario |
| 5.1 Explain the troubleshooting methodology | Knowledge |
| 5.2 Given a scenario, troubleshoot common cabling and physical interface issues | Scenario |
| 5.3 Given a scenario, troubleshoot common issues with network services | Scenario |
| 5.4 Given a scenario, troubleshoot common performance issues | Scenario |
| 5.5 Given a scenario, use the appropriate tool or protocol to solve networking issues | Scenario |

## Question Structures

### 1. Scenario-based

The question tells you about a network, a device, and a problem. You must find the cause or the solution.

> *Example:* Users on one floor cannot get an IP address, but users on other floors can. What is the MOST LIKELY cause?

### 2. Qualifier words (BEST, FIRST, MOST LIKELY, LEAST)

Two or more answers can be correct. Only one answer is the best for the conditions in the question.

> *Example:* A technician must reduce broadcast traffic on a large flat network. What should the technician do FIRST?

### 3. Process and procedure steps

These questions ask about the correct step in a procedure, for example the troubleshooting methodology or change management. Unlike A+ Core 1, Network+ tests the troubleshooting methodology (objective 5.1).

> *Example:* A technician has established a theory of probable cause. What is the NEXT step?

### 4. Definition and recall

These questions test facts: OSI layers, ports, protocols, media, and connectors.

> *Example:* At which OSI layer does a router operate?

### 5. Select the correct item (tool, device, setting, or method)

The question gives a requirement. You must select the correct tool, device, setting, or method.

> *Example:* A technician must find which switch port a cable connects to. Which tool should the technician use?

### 6. Calculation

These questions ask you to calculate addressing values, for example a subnet mask, the number of hosts, or a network address.

> *Example:* How many usable host addresses does a /27 network have?

### 7. Multiple response

The question tells you the number of answers to select. You must select all the correct answers.

> *Example:* Which TWO protocols are used for secure remote management? (Choose two.)

### Performance-based questions (out of scope)

The real exam also has PBQs, for example configuring a device or putting steps in order in a simulation. The app does not include PBQs now.

---

# Part 4: Security+ (SY0-801)

**Status:** In scope (added 2026-10-30). Build its config and content. The module shows greyed out in module selection, and the user cannot select it, until its config has `active: true`.

## Exam Details

| Item | Value |
|---|---|
| Number of questions | Maximum of 90 |
| Time | 90 minutes |
| Passing score | 750 on a scale of 100–900 |
| Question format | Multiple choice and performance-based questions (PBQs) |
| Launch date | November 2026 |
| Recommended experience | Security administrator with two years of hands-on experience |

**Note:** PBQs are out of scope for the app now. A Security+ exam in the app uses multiple-choice questions only. Each attempt has 75–90 questions, the same range as A+ and Network+.

## Topics

| Domain | Weight |
|---|---|
| General security concepts | 16% |
| Threats, vulnerabilities, and attacks | 24% |
| Security architecture | 19% |
| Security operations | 27% |
| Security program management and oversight | 14% |

## Expected Number of Each Question Structure

CompTIA does not publish the number of questions for each structure. The numbers below are estimates. See "How the Estimates Were Calculated" at the end of this file.

| Structure | Objectives (of 26) | Estimated questions (of 90) |
|---|---|---|
| Scenario-based ("Given a scenario…") | 9 | About 30 (33%) |
| Knowledge (Explain, Compare and contrast, Summarize, Describe) | 17 | About 60 (67%) |

Where the scenario questions come from:
- **Security operations:** 5 of 8 objectives (mitigating controls, vulnerability management, identity and access management, automation and orchestration, security investigations). Largest source.
- **General security concepts:** 1 of 3 objectives (change management).
- **Threats, vulnerabilities, and attacks:** 1 of 6 objectives (indicators of malicious activity).
- **Security architecture:** 1 of 4 objectives (protect the infrastructure).
- **Security program management and oversight:** 1 of 6 objectives (security awareness).

Security+ has the smallest scenario share of the four exams. Most of its questions are knowledge questions (concepts, controls, threat types, cryptography, governance, risk, and compliance).

Qualifier words (BEST, FIRST, MOST LIKELY) and multiple-response questions can occur in the two groups. No source gives a count for these.

## Objectives

| Objective | Structure |
|---|---|
| 1.1 Explain security concepts and controls | Knowledge |
| 1.2 Given a scenario, demonstrate the impact of change management processes on security | Scenario |
| 1.3 Explain the importance of using appropriate cryptographic solutions | Knowledge |
| 2.1 Explain characteristics of threats and vulnerabilities | Knowledge |
| 2.2 Describe common threat actors and motivations | Knowledge |
| 2.3 Describe threat vectors and sources | Knowledge |
| 2.4 Explain types of vulnerabilities and attack surfaces | Knowledge |
| 2.5 Given a scenario, analyze indicators of malicious activity | Scenario |
| 2.6 Summarize threats and vulnerabilities associated with artificial intelligence (AI) usage | Knowledge |
| 3.1 Compare and contrast security implications of different architecture models | Knowledge |
| 3.2 Given a scenario, manage the security architecture to best protect the infrastructure | Scenario |
| 3.3 Summarize concepts and strategies used to protect data | Knowledge |
| 3.4 Explain the importance of resilience and recovery in security architecture | Knowledge |
| 4.1 Given a scenario, apply mitigating controls, techniques, and solutions to secure the environment | Scenario |
| 4.2 Explain the security implications of proper hardware, software, and data asset management | Knowledge |
| 4.3 Given a scenario, perform tasks associated with vulnerability management | Scenario |
| 4.4 Explain security alerting and monitoring concepts and tools | Knowledge |
| 4.5 Given a scenario, apply concepts related to identity and access management | Scenario |
| 4.6 Given a scenario, apply automation and orchestration solutions to secure operations | Scenario |
| 4.7 Summarize concepts associated with incident response activities | Knowledge |
| 4.8 Given a scenario, use data, artifacts and sources to support a security investigation | Scenario |
| 5.1 Explain the importance of governance, risk, and compliance artifacts | Knowledge |
| 5.2 Explain the impact of risk management processes on the security of the organization | Knowledge |
| 5.3 Explain the assessment and management processes associated with third-party risk | Knowledge |
| 5.4 Summarize elements of effective security compliance | Knowledge |
| 5.5 Explain concepts associated with audit and assessment activities | Knowledge |
| 5.6 Given a scenario, apply security awareness concepts to improve organizational security | Scenario |

"Describe" (2.2, 2.3) is a new verb in SY0-801. It is a knowledge verb.

## Question Structures

### 1. Scenario-based

The question tells you about an organization, a system, and a security event or need. You must find the attack, the cause, or the control that meets the need.

> *Example:* An analyst sees many failed logins for different accounts from one address, each with the same password. What is the MOST LIKELY attack?

### 2. Qualifier words (BEST, FIRST, MOST LIKELY, LEAST)

Two or more answers can be correct. Only one answer is the best for the conditions in the question.

> *Example:* A company must stop users from copying customer data to removable drives. Which control is the BEST choice?

### 3. Process and procedure steps

These questions ask about the correct step in a process, for example the incident response process, the change management process, or the vulnerability management cycle.

> *Example:* A team has contained an incident. What is the NEXT step?

### 4. Definition and recall

These questions test facts: control types and categories, threat actors, attack types, cryptographic terms, and governance documents.

> *Example:* Which control type is a security guard at a building entrance?

### 5. Select the correct item (control, tool, technology, or method)

The question gives a requirement. You must select the correct control, tool, technology, or method.

> *Example:* A company must verify that a file was not changed after it was sent. Which method should the company use?

### 6. Calculation

A few knowledge questions ask for a simple risk value, for example the annualized loss expectancy (ALE = SLE × ARO). These are pool questions. The scenario generator's `calculation` kind does subnetting only; a risk calculation would be a new calculation type (a code change, see `docs/exam-modules.md`).

> *Example:* An asset is worth a set amount, a fire damages a part of it, and a fire is expected once in a set number of years. What is the ALE?

### 7. Multiple response

The question tells you the number of answers to select. You must select all the correct answers.

> *Example:* Which TWO are examples of multifactor authentication? (Choose two.)

### Performance-based questions (out of scope)

The real exam also has PBQs, for example matching controls to threats, reading logs, or configuring firewall rules in a simulation. The app does not include PBQs now. The PBQs in the Gorgotsias book are not copied into the pool.

## Sources for this exam

The objectives are for SY0-801 (`sources/sec/CompTIA Security+ SY0-801 Exam Objectives (2.0).pdf`). The four books in `sources/sec/` are for the previous exam, SY0-701:

| Book | Kind |
|---|---|
| Heuermann, *CompTIA Security+ SY0-701 Cert Guide* (Pearson, 2024) | Study guide with chapter questions |
| Neil, *CompTIA Security+ SY0-701 Certification Guide*, 3rd ed. (Packt, 2024) | Study guide with chapter questions and mock exams |
| Seidl, *CompTIA Security+ Practice Tests: Exam SY0-701* (Sybex, 2024) | Practice questions by domain, practice exams |
| Gorgotsias, *CompTIA Security+ SY0-701 Practice Tests & PBQs* (ExamsDigest, 2024) | Practice questions and PBQs |

The objectives and the four books are extracted into `sources-text/sec/` (2,692 book questions in `sources-text/derived/questions/sec-*.json`). `sources-text/sources-index.md` has a SY0-701 → SY0-801 objective map. 19 official SY0-801 acronyms are in none of the books (for example LLM, CSPM, SSE, BIMI): a sign of the topics that are new in SY0-801.

SY0-801 changes the domain names and weights of SY0-701, renumbers some objectives, and adds topics (for example 2.6, AI threats and vulnerabilities). So:
- Every book is an older-objective book. Its practice questions go into the pool as they are, tagged with the closest SY0-801 objective, with a `note` when the match is not exact (the same rule as the 220-1101/1102 A+ books).
- Check the facts of each written question and record against the SY0-801 objectives, because no SY0-801 book exists yet (the exam is released in November 2026).
- Topics that are new in SY0-801 (approved 2026-10-30): first look for the facts in the SY0-701 books, also under other objectives or names. Only when the books do not cover a topic (for example 2.6, AI threats), write the questions from online sources (authoritative pages first: CompTIA, NIST, OWASP, MITRE, CISA, vendor documentation; never online question banks or exam dumps). These records have `sourceUrls` and `verified: false`. After the domain's pool is generated, each one is verified against at least two independent sources, then fixed or dropped if the facts do not agree. The rules are in `CLAUDE.md` and `content/README.md`.

---

# Question Structures in the App

How each structure in this file is built in the app (approved 2026-10-30). The method is in `docs/exam-modules.md`.

| Structure | Pool `structure` value | Generated by |
|---|---|---|
| Scenario-based | `scenario` | Scenario generator kinds `fault` (troubleshooting) and `requirement` (setup, configuration, security settings, select a tool or method) |
| Qualifier words | Any structure, with `qualifier` | All kinds (MOST LIKELY, BEST, FIRST, NEXT) |
| Process and procedure steps | `procedure` | Kind `procedure` (FIRST and NEXT step) |
| Definition and recall | `recall` | Pool only |
| Select the correct item | `select-item` | Pool, and kind `requirement` for scenario objectives |
| Calculation | `calculation` | Kind `calculation` (for example subnetting). Security+ risk values (ALE) are pool questions only. |
| Multiple response | Any structure, with `type: "multiple"` | Pool only |

The config of each exam has a `kind` (scenario or knowledge) for each objective, taken from the tables above. Each attempt uses them to divide each domain into scenario and knowledge questions.

---

# How the Estimates Were Calculated

CompTIA does not publish the number of questions for each structure. Each estimate uses the official exam objectives and domain weights:

1. Mark each objective as **scenario** (its title starts with "Given a scenario") or **knowledge** (Explain, Compare and contrast, Summarize, Identify, Describe).
2. For each domain, find the part of its objectives that are scenario objectives. Example: Network troubleshooting has 4 scenario objectives of 5, so 4/5.
3. Multiply that part by the domain weight. Example: 4/5 × 24% = 19.2%.
4. Add the results of all domains. This gives the scenario percentage of the exam.
5. Multiply the percentage by 90 (the maximum number of questions) and round.

Network+ calculation: (1/8 × 23%) + (2/4 × 20%) + (2/5 × 19%) + (1/3 × 14%) + (4/5 × 24%) = 2.9% + 10% + 7.6% + 4.7% + 19.2% = 44.4%. 44.4% × 90 ≈ 40 questions.

Security+ calculation: (1/3 × 16%) + (1/6 × 24%) + (1/4 × 19%) + (5/8 × 27%) + (1/6 × 14%) = 5.3% + 4% + 4.75% + 16.9% + 2.3% = 33.3%. 33.3% × 90 ≈ 30 questions.

The calculation assumes that each objective in a domain has about the same number of questions. The real exam can be different.

## Sources

- [CompTIA – A+ Core 1 (220-1201) V15 exam objectives](https://lecbyo.files.cmp.optimizely.com/download/34be017cb73211ef8985a6f347fbf652)
- [CompTIA – A+ Core 2 (220-1202) objectives comparison](https://lecbyo.files.cmp.optimizely.com/download/95598de4a39611efadacb6f62670d066)
- [CompTIA – A+ Core 1 (V15)](https://www.comptia.org/en-us/certifications/a/core-1-v15/)
- [CompTIA – A+ Core 2 (V15)](https://www.comptia.org/en-us/certifications/a/core-2-v15/)
- [CompTIA – Network+ (N10-009)](https://www.comptia.org/en-us/certifications/network/)
- [CompTIA – Network+ (N10-009) exam objectives](https://onlc.com/comptia/n10-009-exam-objectives.pdf)
- [CompTIA – Security+](https://www.comptia.org/en-us/certifications/security/)
- CompTIA – Security+ (SY0-801) V8 exam objectives, document version 2.0 (`sources/sec/`)
- [ITU Online – CompTIA A+ practice test tips](https://www.ituonline.com/blogs/comptia-a-practice-test-free/)
- [ITU Online – A+ hardware troubleshooting questions](https://www.ituonline.com/blogs/how-to-prepare-for-comptia-a-certification-exam-questions-on-hardware-troubleshooting/)
- [PrepForCerts – A+ practice questions](https://prepforcerts.org/comptia-a-plus-practice-questions)
- [Brainscape – A+ test tips](https://brainscape.com/flashcards/test-tips-16343736/packs/22181028)