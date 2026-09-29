# ITF Workspace and ITF Flow service subscription register

Status: **Active cross-application register**  
Last code audit: **2026-09-28**

## Purpose and interpretation

This register identifies external services, managed infrastructure and professional services needed to operate ITF
Workspace and ITF Flow at production quality. It is intentionally provider-aware where the code is already coupled to
a provider and provider-neutral where ITF has not approved one.

`Required` means the production system needs the capability. It does not always mean a new licence: ITF may satisfy a
requirement with an existing enterprise agreement or internally operated infrastructure. `Conditional` means the cost
is incurred only when the related feature or policy is enabled. Prices and plan limits change, so procurement must use
the linked provider pages and an approved usage forecast rather than copying a price into this document.

Secrets, account identifiers, tenant names and commercial quotations must not be recorded here.

## Required production services

| Capability / service | Applications | Why it is required | Current integration and subscription position | Required decision or action |
|---|---|---|---|---|
| Application hosting and serverless runtime | Both | Hosts the Next.js applications, API routes and server actions with HTTPS and deployment isolation | Both applications are designed for Vercel. A paid production plan is expected for organizational use, team controls, production limits and support; Hobby is intended for personal/non-commercial use. See [Vercel plans](https://vercel.com/docs/plans) and [pricing](https://vercel.com/pricing). | Procure the approved Pro or Enterprise organization plan; confirm region, support, log retention, deployment roles and spending controls. |
| Managed PostgreSQL databases | Both | Stores identity, access, workflow, audit and document metadata. Each application must retain its own database boundary. | Both use Prisma ORM and PostgreSQL connection URLs. Prisma ORM is open source, but managed database capacity, backups and support are billable. Prisma Postgres is the current expected service; see [plans](https://www.prisma.io/pricing) and [service documentation](https://docs.prisma.io/docs/postgres). | Maintain separate Workspace and Flow production databases; select capacity/backup tier and document recovery objectives. |
| Private document object storage | Flow | Stores uploaded, scanned, generated and annotated document bytes outside the stateless application filesystem. | `DOCUMENT_STORAGE_PROVIDER=VERCEL_BLOB` is implemented. Vercel Blob bills stored data, operations and transfer; see [usage and pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing) and [private storage](https://vercel.com/docs/vercel-blob). | Fund the Blob usage attached to the production Vercel team; confirm storage region/data residency, lifecycle, backup and restore approach. EDMS remains the eventual authoritative archive. |
| Transactional email delivery | Workspace | Delivers onboarding, credential and security-related messages. | Resend is integrated through `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. It has free and paid usage tiers; see [Resend pricing](https://resend.com/pricing). | Use an ITF-owned Resend account/domain, select a volume tier, complete DNS authentication and define bounce/incident handling. |
| Official mailbox service with IMAP and SMTP | Flow | Supports correspondence mailbox synchronization and outbound mail for authorized offices such as the DG secretariat. | The application is provider-neutral and uses configured IMAP/SMTP endpoints and credentials. This can be an existing Microsoft 365, Google Workspace or approved internal mail service. | Confirm the authoritative ITF mail provider/licence, shared-mailbox permissions, MFA/app-password policy, retention and service-account ownership. |
| Background scheduling / durable job execution | Both | Runs Flow document/mail workers and Workspace integration-outbox delivery without a user request. | Flow's minute-scale workers can use Vercel Cron on an eligible plan. Workspace currently targets a shorter retry cadence, so a durable queue/worker or revised approved SLA is needed. Vercel Cron's plan limits are documented under [usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing). | Select an approved scheduler/queue. Do not claim Workspace's short retry objective is met by a one-minute cron without changing and accepting the contract. |
| Managed signing key / KMS or HSM | Workspace | Protects the private key used for production launch assertions and supports controlled rotation/audit. | Production configuration requires the `kms` signer; an ephemeral or software key is not production approval. Provider is deliberately unselected. Candidate managed services include [AWS KMS](https://aws.amazon.com/kms/pricing/) and [Azure Key Vault](https://azure.microsoft.com/en-us/pricing/details/key-vault/), or an approved enterprise HSM/Vault. | Security Architecture must select and procure the service, approve key custody/rotation and fund operations before production launch. |
| Domain registration and authoritative DNS | Both | Provides stable trusted application URLs and email/domain verification records. | Vercel can manage TLS certificates, but ITF must own the domain and DNS administration. Costs depend on the existing ITF domain/DNS arrangement. | Assign domain ownership, DNS change control and renewal responsibility; record approved production and staging origins. |
| Backup, restoration and disaster-recovery capacity | Both | Recovers both databases and Flow document bytes and proves that metadata and stored files can be reconciled. | Database-provider backups alone do not prove end-to-end document restoration. Object-versioning/export or a secondary approved backup store may incur separate charges. | Procure the required retention/copy capacity and perform documented restoration tests for both databases and documents. |
| Monitoring, alerting and retained audit/log export | Both | Detects failures, supports incidents and preserves evidence beyond short platform log windows. | Vercel Observability is available on all plans with plan-dependent retention; [Observability](https://vercel.com/docs/observability) and [runtime logs](https://vercel.com/docs/logs/runtime) document the limits. A paid add-on or approved SIEM/log platform may be required. | Set retention/alerting requirements, select Vercel Observability Plus or an enterprise SIEM/log destination, and configure operational ownership. |
| Private source control and CI collaboration | Both | Protects source, reviews changes and integrates controlled deployments. | Git is required, but no commercial source-control provider is hard-coded. An existing enterprise Git service may already cover this cost. | Confirm the approved organization, licence tier, branch protection, reviewer ownership, secret scanning and account lifecycle. |

## Conditional or pending services

| Capability / service | Trigger | Current position | Subscription / cost implication |
|---|---|---|---|
| Malware scanning | `MALWARE_SCANNER=ENABLED` | Flow supports a provider boundary and quarantines until a configured scanner returns a clean result. ClamAV software is free/open source, but its always-on HTTP adapter, compute, memory, virus-definition updates, monitoring and availability are not free to operate. A managed scanning API is an alternative subscription. | Required before production unless ITF formally accepts the risk of `DISABLED`; size hosting or API usage against upload volume and availability needs. |
| OCR | Searchable text/extraction from scanned documents | Flow retains an OCR provider boundary but no production provider has been approved. Candidate services include [AWS Textract](https://aws.amazon.com/textract/pricing/), Azure AI Document Intelligence or Google Document AI. | Usage is normally billed per page/feature. Select only after data-residency, accuracy and retention review. |
| Alternative private S3-compatible object storage | ITF selects AWS S3 or another approved object store instead of Vercel Blob | S3 is identified in Flow's roadmap, but the current runtime implements local development storage and private Vercel Blob only. Selecting S3 therefore requires an adapter, credentials/role design, region and lifecycle policy; setting an environment value alone is insufficient. | Conditional storage, request, transfer, replication and backup charges. |
| EDMS integration and support | EDMS becomes the authoritative archive | The existing EDMS is outside these repositories. Flow's storage contract keeps this as a future provider/integration rather than silently treating Blob as permanent records management. | May use an existing licence, but redesign, hosting, support and integration work must be budgeted separately. |
| Office-to-PDF document conversion | `DOCUMENT_CONVERTER_PROVIDER=GOTENBERG` is enabled so DOCX/XLSX can join the annotatable memo packet | Flow now implements the [Gotenberg LibreOffice conversion route](https://gotenberg.dev/docs/convert-with-libreoffice/convert-to-pdf). Gotenberg is self-hostable; ITF must operate it on approved private compute/networking or procure an approved managed offering. When disabled or unavailable, the original Office file remains separately visible and is never silently discarded. Rich in-browser Office editing remains a separate future decision. | Conditional infrastructure/support or managed-service cost. Size CPU, memory, concurrency, fonts, monitoring and availability; do not send confidential files to a public/unapproved converter. |
| Certificate-backed digital signatures and trusted timestamps | Policy requires signatures verifiable outside ITF Flow | Current application approval signatures are authenticated, revision-bound application assertions; they are not public-key document certificates. Visual signature images also do not provide certificate trust. | A certificate authority, signing service/HSM and possibly a timestamp authority will be required if ITF adopts PAdES or another regulated signature standard. |
| PWA push-notification delivery | Push notifications move beyond basic standards-based Web Push | Browser Web Push can be implemented without a paid messaging vendor, but reliable high-volume delivery, device analytics or native-app channels may justify a managed service. | Conditional. Select a provider only after notification consent, payload privacy and retention policy are approved. |
| Independent assurance services | Production security/accessibility/performance acceptance | Penetration testing, accessibility review and load/resilience exercises require independent evidence even when the software tools are open source. | Budget as one-off or recurring professional services; not necessarily a software subscription. |

## Components that do not themselves require a subscription

The following are not SaaS subscriptions in the current design: Next.js, React, Prisma ORM, ClamAV software,
application cryptography libraries, QR libraries, PDF processing libraries, Flow’s governed visual-signature profile
workflow and ITF memo-output renderer. Signature profile bytes use the existing Flow PostgreSQL database and generated
memo PDFs use the configured document store; those consume existing paid capacity rather than introducing a new
vendor subscription. These components may still require paid hosting,
maintenance, security updates, staff time or commercial support. No current code requires Sentry, Twilio, Firebase,
Redis/Upstash, Dropbox, Box, SharePoint or Google Drive; adding one is an architectural and procurement change, not a
default assumption.

## Procurement and rollout priority

1. Before production: paid application hosting, two production databases, private Blob storage, official email,
   background execution, KMS/HSM, DNS, monitoring and a tested backup/restore arrangement.
2. Before accepting untrusted production uploads: operational malware scanning, unless an explicitly approved and
   time-bounded risk acceptance permits bypass.
3. Before searchable scanned archives: OCR provider and retention/data-residency approval.
4. Before declaring records archival complete: EDMS contract, retention schedule, transfer/reconciliation and audit
   retrieval acceptance.
5. Before accepting Office files as unified memo-packet pages: deploy and approve the private Gotenberg conversion
   service, fonts, monitoring and data-handling policy. Rich Office editing remains separate.
6. Before externally verifiable digital signatures: approve PKI/timestamp architecture.

## Capacity and quotation inputs

Procurement cannot produce a reliable monthly total until ITF records, at minimum:

- active users and peak concurrent users in each application;
- database size, monthly growth, request/compute volume and required backup retention;
- document count, average/max file size, download traffic and retention period;
- inbound/outbound email and synchronized mailbox volumes;
- malware-scan and OCR pages per month;
- DOCX/XLSX conversions per month, average pages, peak concurrency and conversion timeout;
- worker frequency, maximum acceptable delay and retry volume;
- log/audit ingestion volume and retention period;
- production/staging environments, recovery-time objective and recovery-point objective.

## Maintenance rule

The implementer must update this register in the same committed change whenever either application:

- introduces, removes or replaces an external provider, managed platform or paid professional dependency;
- adds a provider-specific environment variable or SDK;
- changes a plan-sensitive limit, data flow, storage region or production availability assumption; or
- turns a conditional service into a production requirement.

The corresponding slice, environment reference, deployment/runbook and implementation register must also be updated
where applicable. Review this register at every production-readiness review and at least quarterly; verify linked plan
and pricing pages rather than treating previously observed prices as permanent.
