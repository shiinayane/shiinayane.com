---
title: "A Map of Japan's IT Industry: SIers, SES, Web Companies, and In-House Development"
published: 2026-08-10
description: "A practical guide to the business models, ownership structures, and contracts behind the labels used in Japanese IT recruiting."
tags: [Japan, Careers, IT, Engineering]
category: Engineering
draft: false
lang: en
translationKey: japan-it-industry-map
---

When I started looking at IT jobs in Japan, it took me a while to notice that many of the terms compared on recruiting sites do not belong to the same classification system.

`SIer`, `SES`, `contract development`, `SaaS`, `Web-kei`, `in-house development`, `jo-shisu`, and `IT consulting` can look like eight separate career paths. In practice, they overlap. An SIer may operate its own SaaS. A manufacturer may have a substantial internal software organization. A product company may still outsource part of its development.

This is what makes the Japanese IT industry difficult to read at first. Sometimes people are describing how a company earns revenue. Sometimes they mean who owns the software, how an engineer joins a project, or simply a style of recruiting and development. Memorizing company labels does not tell you what the daily work will be.

This article separates those layers. It is not a ranking, and it does not try to force every company into one exclusive box. The goal is to explain what each term describes and what you still need to ask when evaluating a particular role.

## Start with separate axes

Japan's official industrial classification does not contain categories called "Web-kei" or "in-house development."

The 2023 revision divides the software industry into [custom software services](https://www.e-stat.go.jp/classifications/terms/10/04/3911), [embedded software](https://www.e-stat.go.jp/classifications/terms/10/04/3912), [software products](https://www.e-stat.go.jp/classifications/terms/10/04/3913), and game software. Internet businesses appear in another group. [Application services and content providers](https://www.e-stat.go.jp/classifications/terms/10/04/4012), for example, include ASPs, SaaS, and content distribution platforms.

Official statistics classify an establishment by its main business. Recruiting discussions also mix in contracts, organizational structure, and engineering culture, so the two vocabularies cannot line up exactly.

When reading a job description, I find it useful to separate at least four questions:

1. **Where does the revenue come from?** Project contracts, software sales, subscriptions, advertising, transaction fees, or an internal budget?
2. **Who owns the software?** The client, the employer, or another company in the same corporate group?
3. **Who decides the requirements and roadmap?** The client, a product team, a business unit, or the head office's IT department?
4. **Where does the engineer work, and who manages them?** An internal team, a client site, a joint project team, or a dispatched-worker arrangement?

Placed back on those axes, the common labels look roughly like this:

| Term | What it mainly describes | What it still does not tell you |
| --- | --- | --- |
| SIer | A business that plans, builds, and integrates systems for clients | Whether engineers code or where the company sits in the supply chain |
| Contract development | Software commissioned by a specific client | Project scale or whether work happens at the client site |
| SES | A commercial label for supplying engineering capacity to client projects | The legal contract, chain of command, or team arrangement |
| SaaS | A product delivered continuously over a network | Whether development is fully internal or how the team works |
| Web-kei | A loose recruiting label for internet product companies and their development culture | It has no single official definition |
| In-house development | Software owned or operated by the employer | Whether some work is outsourced or how central the product is to the business |
| Jo-shisu | The information-systems function inside a non-IT business | Whether the role is help desk, vendor management, or product engineering |
| IT consulting | Advice and implementation around business and technology problems | Whether the role includes coding, deployment, or long-term operations |
| Manufacturer | An employer whose main business is manufacturing | Whether the software role is embedded, mobile, cloud, or internal IT |

Most of the industry map follows from these four questions.

## Why SIers are so prominent in Japan

SIer is the Japanese abbreviation for system integrator. SIers work for banks, insurers, manufacturers, railways, telecommunications companies, government bodies, and other clients, translating business requirements into operational information systems.

System integration usually involves more than programming. A large project may begin with planning and requirements, then continue through architecture, software development, hardware and network procurement, testing, data migration, supplier coordination, and post-launch operations.

In its [2024 Basic Survey of the Information Service Industry](https://www.jisa.or.jp/Portals/0/report/basic2024report.pdf?250521=), JISA defines an SI service as a bundled system-construction service that may include hardware, planning, consulting, and requirements definition. SI services accounted for 51.0% of information-service sales among the JISA member companies that responded. That figure is not a national market share, but it does show how important SI is within Japan's information-services sector.

The structure reflects the way large Japanese organizations have historically procured IT. A client retains the business knowledge and asks an external IT vendor to build the system. The vendor then works with several partner companies according to the scale and specialties required. A common arrangement looks like this:

```text
Client company
    ↓
Prime SIer responsible for the overall project
    ↓
Partner companies responsible for systems or modules
    ↓
More specialized or downstream suppliers
```

Not every project has three or four layers, but re-subcontracting does exist. In its [2020 White Paper on Small and Medium Enterprises](https://www.chusho.meti.go.jp/pamflet/hakusyo/2020/chusho/b2_3_3.html), Japan's Small and Medium Enterprise Agency describes how SCSK projects are often delivered by employees and partner companies together. When capacity is still insufficient, further outsourcing creates additional subcontracting layers.

This is one reason a major Japanese SIer should not be translated directly into the Chinese or Western stereotype of a low-end outsourcing shop. A prime SIer may deal directly with the client and own the requirements, architecture, delivery, and long-term operation of a large budget. A core banking system, railway ticketing platform, or government system is also a different kind of project from a short-lived website contract.

The complication is that jobs at different positions in the same supply chain can be very different.

Engineers at the prime level may spend more time understanding the business, designing systems, coordinating suppliers, and managing delivery. Implementation may be internal or delegated to partners. Engineers farther downstream may be closer to coding and testing, while having less access to the client context, architectural decisions, or long-term operation, depending on the contract.

Asking whether a company is an SIer therefore answers only the first question. A job seeker still needs to check:

- whether the company normally works as the prime contractor or farther downstream;
- how much new-graduate engineers actually code;
- who owns requirements, architecture, testing, and operations;
- how employees and partner companies divide the work;
- whether assignment is based on industry, client, or technical specialty;
- what happens to an engineer when a project ends.

NTT DATA, NRI, Fujitsu, and NEC may all be placed in the broad SIer category, but none of them has only one kind of business. [NTT DATA's own description](https://www.nttdata.com/jp/ja/about-us/) spans consulting, system construction, and operations. NRI combines consulting and systems integration with long-running platforms for financial institutions. The company label is a useful entry point; the department and role are what determine the work.

## Contract development is broader than large-scale SI

The Japanese term *jutaku kaihatsu* covers more ground than SI.

Under the [Japan Standard Industrial Classification](https://www.e-stat.go.jp/classifications/terms/10/04/3911), custom software services develop programs commissioned by clients and may also provide related research, analysis, advice, or bundled services. System integration is one example, but a contract project may also involve:

- building a website or mobile app for one company;
- implementing a module within a larger system;
- developing companion software for a hardware vendor;
- implementing an existing design and specification;
- maintaining and extending a client's live system.

A 30-person development studio and a major prime SIer may both take commissioned work, yet have completely different project sizes, client relationships, and engineering responsibilities.

Contract projects normally have an identifiable client and delivery boundary. They can expose engineers to several industries and technologies in a relatively short time. At the same time, the contract affects when the project ends, who maintains it, and how much authority the team has over requirements and technical decisions.

For these roles, I would check whether the company works directly with the end client, whether engineers join requirements and design discussions, and how they move between projects. Those details say more about the job than the label alone.

## What SES actually means

SES is usually expanded as System Engineering Service. Companies use the term for businesses that supply engineering capacity to client projects, often with engineers working in the client's project or at the client's site.

It is a commercial term, not a single legal contract. The actual arrangement may be worker dispatch, a quasi-mandate contract, or a contract for work. The same company may also operate SES, commissioned development, and its own products.

The [Ministry of Health, Labour and Welfare defines worker dispatch](https://www.mhlw.go.jp/general/seido/anteikyoku/haken/01a.html) as an arrangement in which the engineer is employed by the dispatching company but works under the direction of the receiving company. Under a contract for work, the contractor manages its own employees and independently completes the agreed work. One of the central distinctions is whether the client directly instructs the engineer.

The title on the contract is not decisive. The ministry states that [dispatch and contracting must be judged by the actual working arrangement](https://www.mhlw.go.jp/bunya/koyou/gigi_outou01.html). Calling a contract *ukeoi* while the client directly manages the contractor's employees can amount to disguised contracting.

Compliance is only the baseline for a job seeker. Several practical questions will shape years of work:

- which company signs the employment contract;
- whether daily tasks come from the employer or the client;
- whether the engineer joins alone or as part of a complete internal team;
- how much choice they have over projects, technologies, and location;
- what happens to pay and training between assignments;
- who owns performance reviews, promotion, and career guidance;
- whether technical growth remains coherent after changing clients.

SES companies differ widely. Some provide stable teams, training, and meaningful project choice. Others depend mainly on placing individuals at a sequence of client sites. Treating every SES role as identical hides those differences, while ignoring the contract and reporting line creates avoidable risk.

## Why SaaS, Web-kei, and in-house development appear together

These three terms often appear in the same Product Tech job search, but they describe different things.

### SaaS describes delivery and revenue

SaaS delivers an application continuously over a network. Customers generally pay by subscription, account count, or usage. The service may be for businesses or consumers. Japan's industrial classification places ASP and SaaS under [application services and content providers](https://www.e-stat.go.jp/classifications/terms/10/04/4012).

Unlike a one-time delivery project, a SaaS team remains responsible for the same live service. Features, reliability, security, support, data migration, and cloud costs all return to the product organization. B2B SaaS also has to deal with onboarding, permissions, audits, integrations, and customer-specific business processes.

SaaS still describes only the service model. It does not guarantee a mature engineering culture or fully internal development. Some products are highly standardized; others require substantial customer implementation and customization.

### Web-kei is a recruiting-market label

Web-kei has no official definition. In Japanese recruiting, it normally refers to companies that deliver products over the internet and operate with a Web-oriented development model.

Search, content, social platforms, e-commerce, marketplaces, advertising, and games may all fall under it. [LY Corporation](https://www.lycorp.co.jp/ja/company/), for example, operates search, portal, messaging, advertising, and commerce services. A single product category is not enough to describe it.

The label also carries cultural associations: role-specific hiring, engineers involved in product iteration, continuous delivery, public engineering blogs, and an active market for experienced hires. None of those qualities is guaranteed, and teams within the same company can differ substantially.

### In-house development describes ownership

In-house development usually means that a company develops software it owns, operates, or sells. Work does not end at project acceptance; the team still has to respond to incidents, user feedback, performance issues, and the next release.

It does not mean that every line of code must be written by direct employees. A product company may outsource testing, implementation support, internal systems, or selected features. A group IT company may build software owned by its parent. An SIer may also operate proprietary products, industry platforms, and SaaS.

The useful question behind "in-house" is whether the company controls the product and whether engineers continue to see the codebase, production outcomes, and user feedback. Whether that environment is good for a particular person still depends on the product's importance, team quality, and role.

For my own search, I place B2B SaaS companies such as Sansan, freee, and SmartHR together with consumer companies such as LY Corporation, Mercari, DeNA, and ZOZO in a broad `Product Tech` group. This is not an official Japanese classification. It is simply shorthand for businesses where software is central and product, design, engineering, data, and operations work on it over time.

## Jo-shisu and the growth of internal engineering

Banks, manufacturers, retailers, railways, and trading companies also hire IT professionals. Roles may sit in a traditional information-systems department—commonly called *jo-shisu*—or in a digital, DX, data-platform, or product organization.

Typical responsibilities include:

- internal accounts, devices, networks, and help desk;
- ERP, finance, and HR systems;
- security, compliance, and IT governance;
- vendor selection, procurement, and project management;
- data platforms and business digitization;
- internal tools or customer-facing digital services.

That list covers very different jobs. Some departments focus on procurement, requirements, and vendor management while external SIers write most of the code. Other businesses have built internal engineering organizations with their own repositories, technical career ladders, and product roadmaps. Knowing that the employer is a bank or manufacturer does not tell you whether an engineer develops software.

[IPA's DX Trends 2025](https://www.ipa.go.jp/digital/chousa/dx-trend/tbl5kb0000001mn2-att/dx-trend-2025.pdf) compares system-development sourcing in Japan, the United States, and Germany. For core and competitive business areas, outsourced development was the most common response in Japan, at just under 40%. In the United States, internal development was the most common, at just under 50%.

In the same survey, only 16.7% of Japanese companies said they had already internalized the necessary areas, less than half the proportion in either the United States or Germany. More Japanese companies also planned to continue external development without pursuing internalization. For those attempting it, acquiring and developing talent was a prominent obstacle.

These figures fit the scale of Japan's SI industry. Many businesses historically relied on external vendors, while some are now trying to bring development capability back into strategically important areas. The recruiting market consequently contains traditional information-systems departments, DX-promotion roles, and product-engineering teams that look closer to internet companies.

Internalization also comes in degrees. A company may retain only planning and architecture, or it may build product management, engineering, SRE, and data teams in-house. When a job description says *promoting internal development*, it is worth asking what organization exists today rather than reading a future plan as a current fact.

## The line between IT consulting and SI is increasingly blurred

IT consulting normally begins with management strategy, business processes, data, cloud, security, or systems architecture. Consultants help clients define problems, choose approaches, and carry change forward. SIers are more often understood through system construction and delivery.

Real projects do not always draw a clean line between slides and code. Consulting firms may continue into implementation, data migration, and change management. Major SIers have expanded into planning and consulting. [NTT DATA](https://www.nttdata.com/jp/ja/about-us/) describes a business spanning consulting, system construction, and operations. [NRI](https://www.nri.com/jp/service/industry/finance/fis_about.html) combines consulting, IT solutions, and long-running platforms for financial institutions.

For a role at either kind of company, the useful questions are more specific:

- what Strategy, Business, Technology, and Engineering roles each deliver;
- whether the job includes implementation, launch, and long-term operations;
- whether daily output is analysis, documentation, code, architecture, or project management;
- whether hiring and promotion are role-specific;
- whether new graduates can be assigned across departments.

A consultant, application engineer, cloud engineer, and project manager at the same company may serve the same client and still accumulate very different experience.

## Manufacturers do more than embedded software

Software jobs at manufacturers are often reduced to embedded development. Cars, cameras, appliances, robots, and industrial equipment certainly contain a great deal of embedded software, but manufacturers now also need mobile apps, cloud services, data, AI, security, and internal IT.

A connected device, for example, may involve all of the following:

```text
Device firmware
      ↕
Mobile app
      ↕
Cloud API and account system
      ↕
Data platform and operations console
```

Those components may be built internally or by a group IT company, SIer, or development contractor. Even when job descriptions mention the same product, the roles may sit in different legal entities and contractual relationships.

Manufacturing software often involves hardware coordination, longer product cycles, device testing, functional safety, and stricter release processes. Its pace differs from an internet product, but that does not make the engineering simple or outdated. For someone interested in robotics, automotive systems, IoT, or Apple-platform companion apps, these roles may combine software with valuable domain knowledge.

Telecommunications, cloud, and infrastructure providers form another group. They operate networks, data centers, cloud platforms, security, and managed services. Roles may involve distributed systems, SRE, networking, platform development, and large-scale operations. Some of these companies also deliver client integration projects, bringing them back into the SI map.

## The same Engineer title can describe five different jobs

Imagine five openings that all advertise an iOS app written in Swift. By technology alone, they seem to be the same kind of role:

1. **Internet product company:** the app is one of the company's primary products, and the team follows user metrics, incidents, and continuous releases.
2. **B2B SaaS company:** the app complements an enterprise service, with emphasis on accounts, permissions, security, offline use, and customer workflows.
3. **SIer or development contractor:** the team delivers an app for a bank, retailer, or manufacturer, with scope and technology constrained by a client contract.
4. **SES company:** the employee is assigned to a client's mobile project, and the team or workplace may change with the assignment.
5. **Manufacturer's internal team:** the app is part of a hardware product and must coordinate with devices, firmware, and a longer release cycle.

All five may use Swift and produce excellent apps. The difference lies in product authority, project duration, how user feedback reaches the team, and whether the same people own the next version.

That is why I no longer search only for `iOS Engineer`. The stack tells me what code I may write now. The organizational and commercial relationships shape what that experience becomes.

## How to read a job description

Classifying the company is only an initial filter. I now read the rest in roughly this order.

### 1. Who is the user, and who pays?

Is the user a consumer, a subscribing business, a project client, or an internal employee? Does revenue come from subscriptions, ads, transactions, project contracts, or an internal budget?

This changes how work is measured. A consumer product may emphasize retention and experience. SaaS may focus on onboarding and renewal. A contract project has budget, specification, and acceptance criteria.

### 2. Who decides the roadmap and technical approach?

Can engineering work with product and design to choose the next step, or does it implement requirements already agreed with a client? Does the team own technical decisions, or do they require client, group, or headquarters approval?

Authority also means responsibility. A product team can change direction faster but directly owns metrics and incidents. A large client project has more constraints but may provide experience with complex businesses and systems at scale.

### 3. Who owns the system after launch?

Does the team disband after acceptance? Who takes over performance, security, incidents, user feedback, and later improvements?

Maintaining one system over time develops experience with architectural evolution and technical debt. Moving between projects exposes an engineer to more businesses and technologies. The better fit depends on the intended path.

### 4. What do engineers do each day?

How much time goes to design, coding, testing, client communication, documentation, vendor management, and project management? Titles such as `Engineer`, `SE`, and `Consultant` are not stable across companies.

Employee interviews, engineering blogs, internship descriptions, and concrete answers in interviews tend to be the most useful sources. Even a job that promises involvement "from upstream to downstream" needs clarification about where a new graduate starts.

### 5. What are the team and reporting relationships?

Where does the work happen, and who assigns tasks? Is this a complete internal team, a client-site team, or a project assembled from several companies? Who owns code review, performance evaluation, and career guidance?

This is especially important for SES and contract roles, but it also matters in corporate groups and cross-company projects.

### 6. How are new graduates assigned?

Can applicants choose iOS, backend, or SRE directly, or are they hired into a general technical pool and assigned later? How much do personal preference, business demand, training results, and project vacancies matter? Is internal transfer realistic?

A company having a mobile team does not mean a general new-graduate hire will join it. For someone with a specific direction, the assignment system may matter as much as the business itself.

### 7. What will three years of this job build?

Finally, ask a simple question: after three years, what will be the strongest part of the resume?

It might be large financial systems, client requirements and project delivery, product engineering, mobile architecture, SRE, cloud platforms, domain expertise, or organizational management. Each can create career value. The important part is whether it connects to the next direction.

## How I use this map

Japan's IT industry does not fit into a neat classification tree. SIer, SES, and contract development concern businesses and contracts. SaaS is a delivery model. Web-kei is recruiting vocabulary. In-house development describes ownership, while jo-shisu describes an organizational position. A company appearing in several regions is normal.

The labels are useful for quickly understanding revenue and project position, but they cannot replace investigating the role. An SIer does not automatically mean no coding. In-house development does not automatically mean a mature product team. Department, role, contract, and assignment often tell you more than the category on a company profile.

For me, drawing this map narrowed the search toward Product Tech and Apple platforms. I want to maintain the same product and codebase over time, with performance, experience, and user feedback returning to the team that shipped it. That preference is not an industry ranking. It simply tells me which environments to prioritize.

Someone interested in large systems, industry digitization, client transformation, or infrastructure will find different paths elsewhere on the same map. Understanding where a job sits in these relationships before comparing company names and compensation makes the recruiting language much easier to navigate.

## References

- [Japan Standard Industrial Classification: Custom software services](https://www.e-stat.go.jp/classifications/terms/10/04/3911)
- [Japan Standard Industrial Classification: Embedded software](https://www.e-stat.go.jp/classifications/terms/10/04/3912)
- [Japan Standard Industrial Classification: Software products](https://www.e-stat.go.jp/classifications/terms/10/04/3913)
- [Japan Standard Industrial Classification: Application services and content providers](https://www.e-stat.go.jp/classifications/terms/10/04/4012)
- [JISA: 2024 Basic Survey of the Information Service Industry](https://www.jisa.or.jp/Portals/0/report/basic2024report.pdf?250521=)
- [IPA: DX Trends 2025](https://www.ipa.go.jp/digital/chousa/dx-trend/tbl5kb0000001mn2-att/dx-trend-2025.pdf)
- [Ministry of Health, Labour and Welfare: Worker dispatch](https://www.mhlw.go.jp/general/seido/anteikyoku/haken/01a.html)
- [Ministry of Health, Labour and Welfare: Distinguishing worker dispatch from contracting](https://www.mhlw.go.jp/bunya/koyou/gigi_outou01.html)
- [2020 White Paper on Small and Medium Enterprises: Transaction relationships](https://www.chusho.meti.go.jp/pamflet/hakusyo/2020/chusho/b2_3_3.html)
- [NTT DATA corporate information](https://www.nttdata.com/jp/ja/about-us/)
- [NRI: Combining consulting and IT solutions](https://www.nri.com/jp/service/industry/finance/fis_about.html)
- [LY Corporation corporate information](https://www.lycorp.co.jp/ja/company/)
