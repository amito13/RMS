# RMS: Rent Management Software
## Product Requirements Document

| | |
|---|---|
| **Version** | 1.0 (draft for review) |
| **Date** | 11 Nov 2026 |
| **Owner** | Amit Dewangan |
| **Platforms** | Android and iOS (Expo SDK 58, React Native 0.88) |
| **Backend** | Supabase (Postgres, Auth, Storage, Edge Functions, pg_cron) |
| **Status** | Draft. See [Open questions](#16-open-questions) before build starts. |

---

## 1. Summary

RMS is a mobile app for a landlord who rents out rooms or flats across one or more properties. It replaces the notebook, WhatsApp chats and memory that landlords use today to track who lives where, who has paid, and when the next payment is due.

The app does three jobs:

1. **Keep a complete record of every tenant**: who they are, how many people live with them, their verification documents (Aadhaar as image or PDF), when they moved in, their advance, rent and agreement.
2. **Track money**: monthly rent with partial payments, the advance rent that is still pending, and the total each tenant owes.
3. **Remind the landlord at the right time**: a push notification on the day rent is due, then every day it stays unpaid, and on the new date whenever the landlord agrees to push a payment back. Agreement renewals get reminders too.

Only the landlord uses the app. Tenants never log in.

---

## 2. Problem

A typical landlord with 5 to 50 tenants across a few buildings:

- Forgets which tenant pays on which day, because every tenant moved in on a different date.
- Loses track of partial payments ("he gave ₹5,000 last week, so how much is left?").
- Agrees to move a payment date on a phone call ("not the 10th, give me till the 11th") and then forgets the new date, or forgets that the tenant ever asked.
- Keeps Aadhaar photocopies in a drawer, or as WhatsApp images mixed with personal photos, and can't find them when police verification asks.
- Misses 11-month agreement renewals, so tenants stay on expired agreements at old rent.

---

## 3. Goals and non-goals

### Goals

| # | Goal | How we know |
|---|------|-------------|
| G1 | The landlord never misses a rent due date | A notification arrives on every due date, every unpaid day after it, and every rescheduled date |
| G2 | The landlord always knows exactly who owes what | Any tenant's outstanding amount is one tap away and matches the payment ledger |
| G3 | Every tenant's verification is stored safely in one place | Aadhaar and other documents are attached to the tenant, private to the landlord |
| G4 | Promises and date changes are never lost | Every rescheduled date keeps the original date, new date and reason in the tenant's history |
| G5 | Setting up a property takes under 2 minutes, and adding a tenant under 3 | Measured in usability testing with a real landlord |

### Non-goals (out of scope for v1)

- Tenant login, tenant app or tenant portal.
- Collecting rent online (UPI collect, payment gateway). The landlord records payments that happen outside the app.
- Electricity, water, maintenance or any charge other than rent.
- Security deposits. In RMS, "advance" means **advance rent** (see [§7.6](#76-advance-rent)).
- Multiple users per landlord account (family members, property managers).
- Accounting, GST, income tax reports.
- Sending SMS or WhatsApp reminders to tenants.
- Web app. The Expo project can build for web, but v1 is designed and tested for phones only.

---

## 4. User

### Primary persona: the landlord

- Owns 1 to 10 properties (houses, buildings, PGs), each with 1 to 20 units (rooms, flats, floors).
- Has 5 to 100 tenants in total.
- Uses an Android phone most of the time. Comfortable with WhatsApp and UPI apps, not with spreadsheets.
- Collects rent in cash, UPI or bank transfer, often in parts.
- Speaks Hindi and/or English. (v1 ships in English; see [Open questions](#16-open-questions).)

### Key moments

- **Morning of a due date.** A notification says who to collect from and how much. The landlord calls or visits the tenant.
- **At the door, collecting cash.** They need to record ₹5,000 of ₹8,000 in a few taps.
- **On a phone call, tenant asks for more time.** They move the date to the 11th and type why.
- **New tenant moving in.** They photograph the Aadhaar card, enter rent and advance, and the reminders start on their own.

---

## 5. Glossary

| Term | Meaning in RMS |
|------|----------------|
| **Landlord** | The only user of the app. Owns all data in their account. |
| **Property** | A building or house at one location, for example "Shanti Niwas, Shankar Nagar, Raipur". |
| **Unit** | A rentable space inside a property, with a type (Single room, 1RK, 1BHK, 2BHK…) and a monthly rent, for example "1BHK 2" at ₹8,000. |
| **Vacant / available** | A unit with no active tenant. |
| **Onboarding** | The first-time setup where the landlord enters their property, its units and rent before adding tenants. |
| **Tenant** | A person (the main renter) living in a unit, with their household. |
| **Members** | Number of people living in the unit under this tenant, including the tenant. |
| **Tenancy** | One tenant's stay in one unit, from shift date to move-out. Holds rent, due day, advance and agreement. |
| **Shift date** | The date the tenant moves in. |
| **Rent charge** | The rent owed for one month of a tenancy, with a due date. |
| **Due date** | The date a rent charge should be paid. Starts as the tenancy's due day; the landlord can move it. |
| **Reschedule** | Moving a due date (or renewal date) to a later date, with a reason. |
| **Payment** | Money received from a tenant, full or partial, recorded by the landlord. |
| **Advance** | Advance rent. Months of rent the tenant pays up front, which is later used up against rent charges. |
| **Agreement** | The rental agreement, usually 11 months, with a start date and an end date. |
| **Renewal date** | The agreement's end date, when it must be renewed or the tenant moves out. |
| **Notice period** | Days of notice the tenant or landlord must give before the tenant leaves, e.g. 30 days. |
| **Notice** | A record that the tenant is leaving: who gave it, when, and the planned move-out date. A tenancy with notice is "On notice". |
| **Planned move-out date** | The date the tenant is expected to leave. The unit is "available from" the next day. |
| **Payment history** | A tenant's month-by-month record of whether rent was paid on time, how late, and in how many parts. |
| **Outstanding** | Rent owed and not yet paid, across all of a tenant's rent charges. |
| **Overdue** | A rent charge whose due date has passed and still has an outstanding amount. |

---

## 6. Scope by release

Priorities used in this document: **P0** = must ship in MVP, **P1** = ships shortly after MVP, **P2** = later.

**Exception:** the Notifications row (section 8) is built right after the MVP, as milestone M5, even though it's marked P0. Until then, the Today screen shows everything that's due, overdue or moving out.

| Area | P0 (MVP) | P1 | P2 |
|------|----------|----|----|
| Auth | Email + password, forgot password, sign out | Delete account | Biometric app lock |
| Properties & units | Mandatory first-time setup: location, unit types (1BHK, 2BHK…), counts and rent; add/edit/archive; vacant vs occupied | Vacant units on Today screen | Map pin, property photos |
| Tenants | Full profile, members count, search, filters | Household member names | Tenant photo |
| Documents | Aadhaar (image/PDF), other doc types, view, replace, delete | Image compression and crop | Expiry dates for documents |
| Rent | Monthly charges, partial payments, outstanding, overdue | Edit/void payments with audit trail | Rent receipts (PDF share) |
| Payment history | Per-tenant month-by-month history, on time vs late, delays, promises kept, totals, all-payments timeline | Payment habit label and filter, history on renew/notice sheets | Share history |
| Notice & planned move-out | Notice period per tenancy, record/change/withdraw notice, "Leaving on" status, move-out reminders, units "available from" | Short-notice warning with rent for the notice period | |
| Reschedule | Move due date with reason, history | Reschedule from notification | |
| Advance | Agreed vs received vs pending, apply to rent | Apply on move-out automatically | |
| Agreement | Start/end dates, renew, renewal reminders | Rent revision on renewal | Upload signed agreement scan |
| Notes | Timestamped notes per tenant | Pin a note | |
| Notifications | Due today, overdue daily, rescheduled date, agreement renewal, in-app reminder inbox | Daily digest when many are due, quiet days | Notification actions (Record payment, Reschedule) |
| Dashboard | Today screen: overdue, due today, upcoming | Monthly collection summary | Charts, yearly report, CSV export |
| Move-out | End tenancy, settle dues, archive | Refund due calculation | |

---

## 7. Functional requirements

### 7.1 Authentication and account

| ID | Pri | Requirement |
|----|-----|-------------|
| AUTH-1 | P0 | The landlord signs up with name, email and password (minimum 8 characters) using Supabase Auth. |
| AUTH-2 | P0 | The landlord signs in with email and password. The session persists across app restarts until they sign out. |
| AUTH-3 | P0 | "Forgot password" sends a Supabase password-reset email. The reset link opens the app through the `rms://` scheme and lets them set a new password. |
| AUTH-4 | P0 | Signing out removes this device's push token from the server, so a signed-out phone gets no reminders. |
| AUTH-5 | P0 | On first sign-in the app creates the landlord's profile with default settings: timezone `Asia/Kolkata`, reminder time 09:00, currency INR. |
| AUTH-6 | P1 | "Delete account" permanently deletes the profile, all tenants, payments, notes and every stored document, after typing the account email to confirm. Required by the App Store and Play Store. |
| AUTH-7 | P2 | Optional app lock with device biometrics or PIN, since the app holds Aadhaar documents. |

Acceptance: a landlord can sign up, close the app, reopen it and land on the Today screen without signing in again.

### 7.2 Property setup (first-time onboarding)

The first time a landlord signs in, RMS asks what they rent out **before** anything else. They can't add a tenant until they have at least one property with at least one unit, because every tenant is placed in a unit and takes its rent from it.

**Onboarding steps** (shown once, right after sign-up, full screen, no tabs):

1. **Welcome.** "Let's set up your property. You'll add tenants after this."
2. **Property location.** Property name and where it is (fields below).
3. **Rooms and rent.** What kinds of units the property has, how many of each, and the monthly rent for each kind. For example: 3 × 1BHK at ₹8,000, 2 × 2BHK at ₹12,000, 4 × Single room at ₹4,500.
4. **Review.** Shows the list of units that will be created ("1BHK 1, 1BHK 2, 1BHK 3, 2BHK 1…"), each with its rent, and a total ("9 units, ₹63,000 per month if all are rented"). The landlord can rename any unit or change its rent here.
5. **Done.** "Add another property" or "Add your first tenant".

**Property fields**

| Field | Required | Notes |
|-------|----------|-------|
| Property name | Yes | e.g. "Shanti Niwas". Suggested from the locality if left blank. |
| Address line | Yes | House/plot number and street |
| Area / locality | Yes | e.g. "Shankar Nagar" |
| City | Yes | |
| PIN code | No | 6 digits |
| Map location | No (P2) | Pin on a map, to open directions |
| Notes | No | |

**Unit fields**

| Field | Required | Notes |
|-------|----------|-------|
| Unit type | Yes | **Single room**, **1RK**, **1BHK**, **2BHK**, **3BHK**, **4BHK+**, **Shop**, **Other** (with a label) |
| Unit name / number | Yes | Auto-generated as "<type> <n>" (e.g. "2BHK 1"), editable to anything like "Flat 201" or "Ground floor left". Unique within the property. |
| Floor | No | Ground, 1st, 2nd… |
| Monthly rent | Yes | ₹, whole rupees. The asking rent for this unit. |
| Status | Computed | **Vacant** (available) or **Occupied** |

| ID | Pri | Requirement |
|----|-----|-------------|
| PROP-1 | P0 | On first sign-in, a landlord with no property is sent to onboarding and can't leave it until one property with at least one unit is saved. Closing the app mid-way resumes onboarding at the same step; the entered data is kept as a draft on the device until it's saved. |
| PROP-2 | P0 | The property step collects the property fields above. |
| PROP-3 | P0 | The rooms step lets the landlord add one or more rows of **unit type + count + monthly rent**. Count is 1 to 50. Adding the same type twice is allowed (for example 1BHKs at two different rents). |
| PROP-4 | P0 | Saving creates one unit per count, auto-named and numbered per type, all **Vacant**, in one transaction. |
| PROP-5 | P0 | The landlord can add more properties at any time from the Properties tab, using the same two steps (location, rooms and rent). |
| PROP-6 | P0 | Units can be added, renamed, retyped or have their rent changed later. Changing a unit's rent does **not** change the rent of a tenant already living there; it only pre-fills the next tenant's rent. |
| PROP-7 | P0 | Each unit shows **Occupied** (has an active tenancy, with the tenant's name) or **Vacant** (with its asking rent). One unit has at most one active tenancy. (Shared rooms: see [Open questions](#16-open-questions).) |
| PROP-8 | P0 | The Properties tab lists each property with: location, units by type ("3 × 1BHK, 2 × 2BHK"), occupied vs vacant ("7 of 9 occupied"), and total outstanding rent. |
| PROP-9 | P0 | Property detail lists its units grouped as Vacant and Occupied. Tapping a vacant unit offers "Add tenant here", which opens add-tenant with this unit and its rent pre-filled. |
| PROP-10 | P0 | A property or unit with an active tenancy can't be archived. One with only past tenancies is archived (hidden, history kept), not deleted. A landlord can't archive their last property. |
| PROP-11 | P0 | Add tenant only offers vacant units. If every unit is occupied, it says "All your units are occupied" with buttons to add a unit or a property. |
| PROP-12 | P1 | The Today screen shows a "Vacant units" count and the monthly rent they would bring in, linking to the list of vacant units. |
| PROP-13 | P2 | Map location pin and "Directions" button on the property. |

### 7.3 Tenants

A tenant record holds the person; a tenancy holds the stay. The add-tenant flow creates both at once, so the landlord never has to think about the difference.

**Tenant fields**

| Field | Required | Notes |
|-------|----------|-------|
| Full name | Yes | |
| Phone number | Yes | Indian mobile, 10 digits, stored with +91. Tap to call or open WhatsApp. |
| Alternate phone | No | |
| Number of members | Yes | Integer, 1 to 20, includes the tenant. |
| Permanent address | No | Home-town address, often needed for police verification. |
| Occupation / workplace | No | |
| Emergency contact name and phone | No | |
| Aadhaar last 4 digits | No | Only the last 4 digits are stored, for quick identification. The full number lives only inside the document image/PDF. |
| Documents | No at creation | See [§7.4](#74-tenant-documents-verification). A tenant with no Aadhaar document shows a "Verification missing" badge. |

**Tenancy fields**

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| Property and unit | Yes | | Only vacant units are offered. |
| Shift date (move-in) | Yes | Today | Can be in the past for existing tenants. |
| Monthly rent | Yes | The unit's rent | ₹, whole rupees. Can differ from the unit's asking rent (e.g. a negotiated rent). |
| Rent due day | Yes | Day of the shift date | 1 to 31. In months without that day, the due date is the month's last day. |
| First rent due date | Yes | See below | The first month RMS will track and remind about. |
| Advance agreed | Yes | 0 | Total advance rent the tenant agreed to pay, e.g. ₹16,000 for 2 months. |
| Advance received now | No | 0 | Recorded as an advance payment. Anything left is "advance pending". |
| Agreement start date | Yes | Shift date | |
| Agreement term | Yes | 11 months | |
| Notice period | Yes | 30 days | Days of notice either side must give before move-out (see [§7.10](#710-notice-period-planned-move-out-and-move-out)). |
| Agreement end (renewal) date | Yes | Start + term | Editable. |

**First rent due date (existing tenants).** When the shift date is today or in the future, the first due date is the shift date. When the shift date is in the past (the landlord is entering a tenant who already lives there), the form asks "When is their next rent due?" and defaults to the next occurrence of the due day. RMS does not create charges for months before that date, so old, already-settled months never show as overdue.

| ID | Pri | Requirement |
|----|-----|-------------|
| TEN-1 | P0 | Add tenant is a step-by-step form: (1) Person, (2) Unit and rent, (3) Advance and agreement, (4) Documents, (5) Review. Step 4 can be skipped. Progress is not lost when going back. |
| TEN-2 | P0 | Saving creates the tenant, the tenancy, the first rent charge, and the advance payment (if any) in one transaction. If any part fails, nothing is saved. |
| TEN-3 | P0 | The Tenants tab lists active tenants with name, property and unit, and a status chip: **Overdue ₹X**, **Due today ₹X**, **Partly paid ₹X left**, **Paid**, or **Due on <date>**. |
| TEN-4 | P0 | The list can be searched by name, phone or unit, and filtered by property and by status (Overdue, Due this week, Advance pending, Verification missing, Moving out soon, Moved out). Default sort: overdue first, then by next due date. |
| TEN-5 | P0 | The tenant detail screen shows: header (name, unit, call and WhatsApp buttons), money summary (outstanding, next due date and amount, advance pending, advance balance), and sections for Payments, Documents, Agreement, Notes and Profile. |
| TEN-6 | P0 | Every tenant and tenancy field can be edited after creation. Changing monthly rent or due day applies to rent charges created after the change; existing charges keep their amount unless the landlord edits them. |
| TEN-7 | P1 | Household member names and ages can be added (optional), alongside the members count. |
| TEN-8 | P2 | A tenant photo. |

### 7.4 Tenant documents (verification)

| ID | Pri | Requirement |
|----|-----|-------------|
| DOC-1 | P0 | Each tenant can have multiple documents. Each document has a type: **Aadhaar (front)**, **Aadhaar (back)**, **Aadhaar (full PDF)**, **PAN**, **Rental agreement**, **Police verification**, **Photo**, **Other** (with a label). |
| DOC-2 | P0 | Images can be added by taking a photo with the camera or picking from the gallery (`expo-image-picker`). PDFs and images can be picked from files (`expo-document-picker`, limited to `image/*` and `application/pdf`). |
| DOC-3 | P0 | Allowed formats: JPEG, PNG, HEIC (converted to JPEG before upload), PDF. Maximum 10 MB per file. Larger files are rejected with a clear message. |
| DOC-4 | P0 | Documents upload to a **private** Supabase Storage bucket. They are never public. The app shows them through short-lived signed URLs (5 minutes). |
| DOC-5 | P0 | Images open full screen with pinch-to-zoom. PDFs open in the system viewer. |
| DOC-6 | P0 | A document can be replaced or deleted. Deleting asks for confirmation and removes the file from storage. |
| DOC-7 | P0 | An upload shows progress and can be retried on failure. The tenant is saved even if a document upload fails; the document shows "Upload failed, tap to retry". |
| DOC-8 | P0 | A tenant with no Aadhaar document shows "Verification missing" on their card and detail screen. |
| DOC-9 | P1 | Photos are resized (max 2000 px on the long edge) and compressed before upload to save data and storage. The landlord can crop before saving. |
| DOC-10 | P1 | Documents can be shared out of the app (for police verification) through the system share sheet, after a confirmation that the file contains personal data. |

### 7.5 Rent and payments

**Rent charges.** RMS creates one rent charge per tenancy per month. Each charge stores the month it covers, the amount due, its original due date and its current due date.

- A charge is created automatically for each active tenancy, starting from the first rent due date, so that every charge due within the next 31 days already exists. A daily server job does this (see [§9.4](#94-scheduled-jobs)).
- No charges are created for dates after the move-out date.

**Charge status** (computed, never stored by hand):

| Status | Rule |
|--------|------|
| Upcoming | Nothing paid, due date is after today |
| Due today | Outstanding > 0, due date is today |
| Partly paid | 0 < paid < amount due, due date is today or later |
| Overdue | Outstanding > 0, due date is before today |
| Paid | Outstanding = 0 |
| Waived | Landlord waived the remainder (with a reason) |

| ID | Pri | Requirement |
|----|-----|-------------|
| RENT-1 | P0 | "Record payment" is reachable from the tenant detail screen, the Today screen and a reminder notification. It opens a bottom sheet with: amount (prefilled with the oldest charge's outstanding), date (today), mode (Cash, UPI, Bank transfer, Cheque, Other), reference (optional, e.g. UPI ref), and note (optional). |
| RENT-2 | P0 | Partial payments are allowed. A payment is applied to the **oldest unpaid charge first**, then the next, so the landlord doesn't have to pick a month. They can override and pick a specific month. |
| RENT-3 | P0 | If a payment is more than the total outstanding, RMS asks whether to keep the extra as advance balance or to reduce the amount. |
| RENT-4 | P0 | The Payments section shows each month: amount due, paid, outstanding, status, due date (and original date if moved), and the list of payments against it. |
| RENT-5 | P0 | Outstanding for a tenant = sum of (amount due − paid − waived) over all their charges that are due today or earlier. |
| RENT-6 | P0 | A charge's amount can be edited (for example a one-off discount), and its remainder can be waived with a reason. Both are recorded in the tenant's notes automatically. |
| RENT-7 | P1 | A payment can be edited or voided. Voided payments stay in history, struck through, with who voided it and when. |
| RENT-8 | P2 | Generate a rent receipt PDF for a payment and share it with the tenant. |

**Example.** Ravi's rent is ₹8,000, due on the 2nd. On 2 Nov he pays ₹5,000 in cash. The November charge shows "Partly paid, ₹3,000 left". On 3 Nov it becomes "Overdue, ₹3,000". On 5 Nov he pays ₹3,000 by UPI and the charge becomes "Paid".

#### Payment history

Every tenant has a payment history that shows not just what they paid, but **how reliably** they pay. It answers the questions a landlord asks before renewing, raising rent, or chasing a payment: "Does this tenant usually pay on time? How late do they get? Do they keep their promises?"

**How each month is judged.** A month is settled on the day its payments (including "From advance") first add up to the amount due. That day is compared with the **original** due date, so rescheduling doesn't hide lateness:

| Result | Rule | Shown as |
|--------|------|----------|
| On time | Settled on or before the original due date | "On time" (green) |
| Late, promise kept | Settled after the original date but on or before the rescheduled date | "6 days late, paid on promised date" |
| Late | Settled after the original date (and after any rescheduled date) | "9 days late" |
| Paid in parts | Settled with 2 or more payments | Extra label "in 3 parts", alongside the result above |
| Waived | Remainder waived | "₹2,000 waived" |
| Still unpaid | Not settled yet, due date passed | "Unpaid, 12 days" |
| Not due yet | Due date is in the future | Not counted |

| ID | Pri | Requirement |
|----|-----|-------------|
| HIST-1 | P0 | The tenant detail screen has a **Payment history** section. At the top, a summary for the last 12 months (or since move-in, if shorter): "On time 8 of 11 months. Late 3 times, 5 days on average, longest 14 days (March)." |
| HIST-2 | P0 | Below the summary, a month-by-month strip of coloured dots (green on time, amber late, red unpaid, grey waived) for the last 12 months. Tapping a month opens its details. |
| HIST-3 | P0 | A full month-by-month list, newest first: month, amount due, amount paid, result (table above), original and rescheduled due dates, and every payment in that month with date, amount, mode and reference. |
| HIST-4 | P0 | **Promises kept:** count of rescheduled months paid by the promised date, e.g. "Kept 3 of 4 promised dates". Shown in the summary when the tenant has rescheduled at least once. |
| HIST-5 | P0 | **Totals:** total rent paid since move-in, total paid this financial year (Apr–Mar), and total waived. |
| HIST-6 | P0 | An **All payments** view lists every payment for the tenant (rent and advance) as one timeline, filterable by year and by mode (Cash, UPI, Bank, Cheque, From advance). |
| HIST-7 | P1 | A **payment habit** label once the tenant has 3 or more settled months: **Usually on time** (80%+ on time in the last 6 months), **Sometimes late**, or **Often late** (50%+ late). Shown on the tenant card in the Tenants list and on the tenant detail header. Filter "Often late" in the Tenants list. |
| HIST-8 | P1 | The payment summary (HIST-1 and HIST-4) is shown on the **Renew agreement** sheet and the **Record notice** sheet, where the landlord decides whether to renew or raise rent. |
| HIST-9 | P1 | Overdue reminders for a tenant labelled "Often late" add a line: "Late 4 of the last 6 months." |
| HIST-10 | P2 | Share a tenant's payment history as a text summary or PDF (for example, as a reference for the tenant's next landlord), after a confirmation that it contains personal data. |

Months before the tenant's first rent due date in RMS are not counted (the landlord didn't track them here). A moved-out tenant's history stays visible, read-only.

### 7.6 Advance rent

Advance is rent the tenant pays up front. It is not a refundable security deposit.

For each tenancy RMS tracks:

| Value | Meaning |
|-------|---------|
| Advance agreed | What the tenant agreed to pay as advance, e.g. ₹16,000 |
| Advance received | Sum of advance payments so far |
| **Advance pending** | Agreed − received. If 0, the advance shows as **Done**. |
| Advance balance | Received − already used against rent. Money the landlord holds for future rent. |

| ID | Pri | Requirement |
|----|-----|-------------|
| ADV-1 | P0 | The tenant detail screen shows advance status: "Advance done, ₹16,000" or "Advance pending, ₹6,000 of ₹16,000". |
| ADV-2 | P0 | The landlord records advance payments (full or partial) the same way as rent, choosing "Advance" as the payment type. |
| ADV-3 | P0 | "Use advance" on any unpaid charge pays it (fully or partly) from the advance balance. This is recorded as a payment with mode "From advance", and the advance balance goes down. |
| ADV-4 | P0 | Advance pending appears on the Today screen totals and in the "Advance pending" filter. It does **not** trigger push reminders in v1. |
| ADV-5 | P1 | During move-out, any remaining advance balance is offered to settle outstanding rent first; anything left is shown as "Refund due to tenant". |

### 7.7 Rescheduling a due date

This is the "not the 10th, give me till the 11th" case.

| ID | Pri | Requirement |
|----|-----|-------------|
| RES-1 | P0 | Any unpaid or partly paid rent charge can be rescheduled to a date later than its current due date and no earlier than today. (An overdue charge can be moved to today or later.) |
| RES-2 | P0 | The reschedule sheet has: new date (quick picks: Tomorrow, +2 days, +1 week, or a calendar), and reason (optional text, e.g. "Salary comes on 11th"). |
| RES-3 | P0 | Rescheduling changes only that one month's due date. The tenancy's normal due day stays the same for future months. |
| RES-4 | P0 | Every reschedule is kept in history: original date, previous date, new date, reason, and when it was changed. A charge can be rescheduled more than once. |
| RES-5 | P0 | Each reschedule automatically adds a note to the tenant, e.g. "November rent moved from 10 Nov to 11 Nov: Salary comes on 11th." |
| RES-6 | P0 | While a charge is rescheduled, it is **not** overdue between the original date and the new date, and no overdue reminders are sent for it. Reminders resume on the new date (see [§8](#8-notifications)). |
| RES-7 | P0 | The charge shows the new date with the original crossed out: "Due 11 Nov (was 10 Nov)". |
| RES-8 | P1 | "Reschedule" can be opened directly from a reminder notification. |
| RES-9 | P0 | The agreement renewal date can be rescheduled the same way, with the same history and note. |

### 7.8 Agreement and renewal

| ID | Pri | Requirement |
|----|-----|-------------|
| AGR-1 | P0 | Each tenancy has an agreement with start date, term (months) and end date. The end date is the **renewal date**. |
| AGR-2 | P0 | The tenant detail screen shows "Agreement ends on 10 Oct 2027 (in 11 months)" and, when ended, "Agreement expired 5 days ago". |
| AGR-3 | P0 | "Renew agreement" sets a new start date (default: the old end date), a term (default: same as before) and calculates the new end date. The previous agreement is kept in history. |
| AGR-4 | P1 | Renewing can change the monthly rent, with an effective date. Charges created from that date use the new rent. The rent change is shown in history and notes. |
| AGR-5 | P0 | The renewal date can be rescheduled (RES-9) without renewing, for when the landlord and tenant agree to sort it out later. |
| AGR-6 | P2 | Upload the signed agreement as a document linked to that agreement period. |

### 7.9 Notes

| ID | Pri | Requirement |
|----|-----|-------------|
| NOTE-1 | P0 | Each tenant has a timeline of notes, newest first. Each note has text, a type and a timestamp. |
| NOTE-2 | P0 | Note types: **General**, **Payment promise**, **Renewal**, **Complaint/repair**, and system types written by the app: **Reschedule**, **Rent change**, **Waiver**, **Move-out**. |
| NOTE-3 | P0 | The landlord can add, edit and delete their own notes. System notes can't be edited, only deleted. |
| NOTE-4 | P0 | The latest note is shown on the tenant detail header, so the landlord sees the last promise before calling. |
| NOTE-5 | P1 | A note can be pinned to stay at the top. |

### 7.10 Notice period, planned move-out and move-out

Tenants rarely just leave. They (or the landlord) give notice first: "We're leaving at the end of next month." RMS records that notice so the landlord knows who's leaving, when the unit becomes free, and what has to be settled before the tenant goes.

**Notice period.** Each tenancy has an agreed notice period, set when the tenant is added (step 3, with the agreement) and editable later.

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| Notice period | Yes | 30 days | 0 to 180 days. The landlord can set a property-wide default in Settings (P1). |

**Notice.** Recorded on the tenancy with "Record notice" on the tenant detail screen.

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| Given by | Yes | Tenant | **Tenant** (tenant is leaving) or **Landlord** (landlord asked them to leave) |
| Notice date | Yes | Today | The day notice was given. Can be in the past, not in the future. |
| Planned move-out date | Yes | Notice date + notice period | The date the tenant will leave. Must be on or after the notice date. |
| Reason | No | | Free text, e.g. "Job transfer to Pune" |

**Tenancy status.** A tenancy is **Active**, **On notice** (notice recorded, not yet moved out) or **Ended**.

| ID | Pri | Requirement |
|----|-----|-------------|
| NOTICE-1 | P0 | Each tenancy has a notice period (default 30 days), entered in add-tenant step 3 and shown in the Agreement section: "Notice period: 30 days". |
| NOTICE-2 | P0 | "Record notice" on an Active tenancy opens a sheet with the fields above. The planned move-out date is pre-filled as notice date + notice period, and the sheet shows the rent still to be collected until then (outstanding now + charges due before the planned move-out date). |
| NOTICE-3 | P0 | **Short notice.** If the planned move-out date is earlier than notice date + notice period, the sheet warns: "Short notice: 12 days less than the agreed 30 days." The landlord can still save. The warning is kept on the notice and in the note. |
| NOTICE-4 | P0 | Saving sets the tenancy to **On notice**, and adds a system note: "Notice given by tenant on 1 Nov. Leaving on 30 Nov. Reason: Job transfer to Pune." |
| NOTICE-5 | P0 | An On-notice tenant shows a **"Leaving 30 Nov"** chip (with days left) on their card in the Tenants list, on the tenant detail header, and on the unit in the property screen. |
| NOTICE-6 | P0 | The unit shows **"Available from 1 Dec"** (day after planned move-out) in the property screen and in a new **Moving out soon** filter on the Tenants list. |
| NOTICE-7 | P0 | The planned move-out date can be changed (earlier or later). Each change is kept in history with old date, new date and reason, and adds a system note, like rescheduling. |
| NOTICE-8 | P0 | **Withdraw notice** (the tenant decides to stay) returns the tenancy to Active, keeps the withdrawn notice in history, and adds a note. Rent charges and reminders carry on as before. |
| NOTICE-9 | P0 | While On notice: rent charges are still created and rent reminders still sent, but **only for rent due on or before the planned move-out date**. No charge is created for a month whose due date is after it. |
| NOTICE-10 | P0 | While On notice, agreement renewal reminders stop, because the tenant isn't renewing. |
| NOTICE-11 | P0 | Move-out reminders are sent (see [§8.1](#81-when-reminders-are-sent)): 3 days before the planned move-out date, on the day, and every day after it until the landlord ends the tenancy, changes the date, or withdraws the notice. |
| NOTICE-12 | P0 | On the planned move-out date, the tenant detail screen shows a prominent **End tenancy** button with the settlement summary (OUT-1), pre-filled with the planned date as the move-out date. |
| NOTICE-13 | P1 | **Rent for short notice.** When notice is short, the landlord can choose "Charge rent for the full notice period", which adds a final charge for the missing days (monthly rent ÷ 30 × days short). It appears in the settlement. |
| NOTICE-14 | P1 | Settings: default notice period for new tenants. |

**Move-out**

| ID | Pri | Requirement |
|----|-----|-------------|
| OUT-1 | P0 | "End tenancy" asks for the move-out date (pre-filled with the planned move-out date if notice was given) and shows a settlement summary: outstanding rent, advance balance, and the net amount (tenant owes or refund due). The landlord can also end a tenancy without notice (e.g. the tenant left suddenly). |
| OUT-2 | P0 | The landlord can record a final payment, use the advance balance, and waive the rest, from the same screen. |
| OUT-3 | P0 | After confirmation, the tenancy is ended, the unit becomes vacant, no new charges are created, and **all reminders for that tenancy stop**, even if a balance remains. |
| OUT-4 | P0 | Moved-out tenants stay in the app under the "Moved out" filter, read-only, with all documents, payments and notes. |
| OUT-5 | P1 | Moved-out tenants with money still owed are listed in a "Dues after move-out" section on the Today screen. |
| OUT-6 | P1 | A moved-out tenant's documents can be deleted in bulk ("Delete documents for moved-out tenants older than 1 year"), to limit how much personal data is stored. |

### 7.11 Today screen (home)

The first tab. Answers "who do I collect from today?"

| ID | Pri | Requirement |
|----|-----|-------------|
| DASH-1 | P0 | Sections, in order: **Overdue** (oldest first, with days overdue), **Due today**, **Due in the next 7 days**, **Moving out in the next 30 days** (with planned date, outstanding and "End tenancy" once the date arrives), **Agreements ending in the next 30 days**. Empty sections are hidden. |
| DASH-2 | P0 | Each row: tenant name, property and unit, amount outstanding, due date, and quick actions **Record payment**, **Call**, **Reschedule**. |
| DASH-3 | P0 | Totals at the top: **To collect today** (overdue + due today), **Collected this month**, **Advance pending**. |
| DASH-4 | P0 | When nothing is due: an empty state that says when the next rent is due and from whom. |
| DASH-5 | P0 | Pull to refresh. Data also refreshes when the app returns to the foreground. |
| DASH-6 | P1 | Monthly summary: expected rent, collected, outstanding, per property. |
| DASH-7 | P2 | Yearly report and CSV export of payments. |

### 7.12 Settings

| ID | Pri | Requirement |
|----|-----|-------------|
| SET-1 | P0 | Profile: name, email (read-only), change password. |
| SET-2 | P0 | Reminder time: the time of day reminders are sent. Default 9:00 AM. |
| SET-3 | P0 | Reminder toggles: rent due today, overdue (daily), agreement renewal, move-out. All on by default. |
| SET-4 | P0 | Notification permission status. If notifications are off at OS level, show a banner with a button that opens the system settings. |
| SET-5 | P0 | Sign out. |
| SET-6 | P1 | Delete account (AUTH-6). |
| SET-7 | P1 | Quiet days (for example, no reminders on Sundays; they're sent the next day instead). |

---

## 8. Notifications

Push notifications are the most important feature in RMS. They are sent **by the server**, not scheduled on the phone, so that they stay correct when payments are recorded, dates are moved, or the landlord uses a second phone.

### 8.1 When reminders are sent

All reminders are sent once a day, at the landlord's reminder time (default 9:00 AM, in their timezone).

| Type | Sent when | Repeats | Stops when |
|------|-----------|---------|------------|
| **Rent due today** | A rent charge's current due date is today and outstanding > 0 | Once | |
| **Rent overdue** | A rent charge's current due date is before today and outstanding > 0 | **Every day** | Charge is paid or waived, its date is moved to the future, or the tenancy ends |
| **Rescheduled rent due** | A rescheduled charge's new due date is today | Once, then overdue rules apply from the next day | |
| **Agreement renewal due** | The agreement's renewal date (or its rescheduled date) is today and it hasn't been renewed | Every 7 days after the date | Agreement is renewed, its date is moved, notice is recorded, or the tenancy ends |
| **Move-out coming up** | A tenant on notice has a planned move-out date 3 days from today | Once | |
| **Move-out today** | A tenant's planned move-out date is today | Once | |
| **Move-out pending** | The planned move-out date has passed and the tenancy hasn't been ended | **Every day** | Tenancy is ended, the date is moved to the future, or notice is withdrawn |

Rules:

- **Rescheduling replaces the date.** A charge moved from 10 Nov to 11 Nov gets no reminder on 10 Nov and a "due today" reminder on 11 Nov. If it's still unpaid, daily overdue reminders start on 12 Nov.
- **Partial payment changes the amount.** The reminder always shows the current outstanding, not the original rent.
- **One rent reminder per tenant per day.** If a tenant has an overdue month and a month due today, one reminder shows the total. The overdue wording wins.
- **No duplicates.** A tenant gets at most one rent reminder, one agreement reminder and one move-out reminder per day, even if the job runs twice.
- **Every device.** Reminders go to every phone where the landlord is signed in.
- **Too many at once.** If more than 5 tenants need a reminder on the same morning, the landlord gets the 5 most overdue as separate notifications plus one summary: "3 more tenants owe rent today: ₹21,000. Open RMS to see the list." (P1. In P0, one notification per tenant.)

### 8.2 Notification content

Each notification names the tenant, the amount to collect, and when they last paid, as the landlord asked: "you have to take money from this tenant, this much amount, last paid on this date".

| Type | Title | Body |
|------|-------|------|
| Due today | Collect rent from Ravi Kumar | ₹8,000 for November rent, Flat 2B, Shanti Niwas. Last paid ₹8,000 on 2 Oct. |
| Due today, partly paid | Collect rent from Ravi Kumar | ₹3,000 left of ₹8,000 for November, Flat 2B. Last paid ₹5,000 on 2 Nov. |
| Rescheduled | Collect rent from Ravi Kumar today | ₹8,000 for November, moved from 10 Nov. Note: "Salary comes on 11th". |
| Overdue | Ravi Kumar's rent is 3 days overdue | ₹8,000 for November was due on 2 Nov. Last paid ₹8,000 on 2 Oct. |
| Overdue, several months | Ravi Kumar owes ₹16,000 | October and November rent are unpaid. Oldest was due on 2 Oct. |
| Agreement renewal | Ravi Kumar's agreement ends today | The 11-month agreement for Flat 2B started on 2 Dec 2025. Renew it or end the tenancy. |
| Move-out in 3 days | Ravi Kumar leaves Flat 2B on 30 Nov | Settle before he goes: ₹3,000 rent outstanding, ₹8,000 advance balance. |
| Move-out today | Ravi Kumar is moving out today | Flat 2B, Shanti Niwas. Check the flat and end the tenancy to settle ₹3,000 outstanding. |
| Move-out pending | Ravi Kumar was due to leave 2 days ago | Planned move-out was 30 Nov. End the tenancy, or change the date if he's staying longer. |

Formatting rules:

- Amounts use Indian grouping: ₹1,00,000, not ₹100,000.
- Dates use "2 Nov" in the same year and "2 Nov 2025" otherwise.
- If the tenant has never paid, the last line is "No payments recorded yet."
- Payload stays well under Expo's 4 KB limit; long names and notes are truncated.

### 8.3 Tapping a notification

| ID | Pri | Requirement |
|----|-----|-------------|
| NOTIF-1 | P0 | Tapping a rent reminder opens that tenant's detail screen with the Record payment sheet open and prefilled. |
| NOTIF-2 | P0 | Tapping an agreement reminder opens the tenant's Agreement section. |
| NOTIF-2a | P0 | Tapping a move-out reminder opens the tenant's detail screen with the End tenancy settlement summary (OUT-1) ready. |
| NOTIF-3 | P0 | Tapping the summary notification opens the Today screen. |
| NOTIF-4 | P0 | If the app is signed out when a notification is tapped, it opens sign-in and then continues to the target screen. |
| NOTIF-5 | P0 | If the tenant was moved out or deleted since the notification was sent, open the Today screen with a message "This tenant is no longer active." |
| NOTIF-6 | P2 | Notification action buttons: "Record full payment" and "Remind me tomorrow" (reschedule +1 day), without opening the app. |

### 8.4 In-app reminders inbox

| ID | Pri | Requirement |
|----|-----|-------------|
| NOTIF-7 | P0 | Every reminder sent is also saved and listed in a Reminders screen (bell icon on Today), newest first, for 90 days. |
| NOTIF-8 | P0 | The inbox works even when push permission is denied, so the landlord can still see what is due. |
| NOTIF-9 | P0 | Items show as unread until opened. The bell shows the unread count. |

### 8.5 Permission and token handling

| ID | Pri | Requirement |
|----|-----|-------------|
| NOTIF-10 | P0 | After the landlord adds their first tenant (not at first launch), the app explains why reminders matter and then asks for notification permission. |
| NOTIF-11 | P0 | On Android, the app creates a notification channel "Rent reminders" (high importance) **before** requesting permission and before getting the push token. Android 13+ won't show the permission prompt until a channel exists. |
| NOTIF-12 | P0 | The app gets an Expo push token with `getExpoPushTokenAsync({ projectId })`, passing the EAS project ID explicitly, and saves it to the `push_tokens` table with platform and device name. It refreshes the token on every app start. |
| NOTIF-13 | P0 | The server deletes a token when Expo reports `DeviceNotRegistered`. |
| NOTIF-14 | P0 | If permission is denied, Settings and the Today screen show a dismissible banner explaining that reminders won't arrive, with a button to open system settings. |

---

## 9. Technical design

### 9.1 Stack

| Layer | Choice |
|-------|--------|
| App | Expo SDK 58, React Native 0.88, React 19, TypeScript, Expo Router (routes in `src/app/`), React Compiler on |
| Package manager | Bun (`bun.lock`). Add native packages with `bunx expo install <pkg>`. |
| Backend | Supabase: Postgres with Row Level Security, Auth (email/password), Storage (private bucket), Edge Functions (Deno), `pg_cron` + `pg_net` for schedules, Vault for secrets |
| Push | `expo-notifications` on device, Expo Push Service (`https://exp.host/--/api/v2/push/send`) from an Edge Function |
| Files | `expo-image-picker` (camera, gallery), `expo-document-picker` (PDF and images from files) |
| Supabase client | `@supabase/supabase-js`, with the session persisted using the storage adapter from Supabase's current Expo guide |
| Builds | EAS Build. **Remote push does not work in Expo Go on Android (since SDK 53), so a development build is required** (`eas build --profile development`). |

Before writing code against any Expo API, check the SDK 58 docs at `https://docs.expo.dev/versions/v58.0.0/` (see `AGENTS.md`).

### 9.2 Architecture

```
 Landlord's phone (Expo app)
   │  supabase-js (auth, queries, storage uploads)
   ▼
 Supabase
   ├─ Auth ............. email + password
   ├─ Postgres ......... tables below, RLS on every table
   ├─ Storage .......... private bucket "tenant-documents"
   ├─ pg_cron
   │    ├─ every day 00:05 IST ...... generate_rent_charges()   (SQL function)
   │    ├─ every 15 minutes ......... call Edge Function "send-reminders"
   │    └─ every 30 minutes ......... call Edge Function "check-push-receipts"
   └─ Edge Functions
        ├─ send-reminders ......... builds today's reminders, writes them to
        │                           "notifications", sends via Expo Push API
        └─ check-push-receipts .... reads Expo receipts, removes dead tokens
                     │
                     ▼
          Expo Push Service ──► FCM (Android) / APNs (iOS) ──► landlord's phone
```

Why the server sends reminders instead of the phone scheduling local notifications: local notifications are fixed when scheduled, so they'd be wrong after a payment or reschedule made on another device, they'd stop if the app was uninstalled and reinstalled, and exact-time alarms on Android 12+ need a permission Play Store restricts.

### 9.3 Data model

All tables have `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()` and `updated_at timestamptz`. Every table except `profiles` has `landlord_id uuid references auth.users` for RLS. Money is stored as `integer` rupees (no paise in v1).

**profiles** (one row per landlord, `id = auth.users.id`)
```
id, full_name, timezone text default 'Asia/Kolkata', reminder_time time default '09:00',
remind_due_today bool default true, remind_overdue bool default true,
remind_agreement bool default true, last_reminder_run_on date
```

**push_tokens**
```
id, landlord_id, expo_push_token text unique, platform ('android'|'ios'),
device_name, last_seen_at
```

**properties**
```
id, landlord_id, name, address_line, locality, city, pincode char(6),
latitude numeric, longitude numeric,  -- P2 map pin
notes, archived_at
```

**units**
```
id, landlord_id, property_id → properties, name,
unit_type ('single_room'|'1rk'|'1bhk'|'2bhk'|'3bhk'|'4bhk_plus'|'shop'|'other'),
type_label text,  -- only for 'other'
floor text, monthly_rent int not null check (> 0), archived_at
unique (property_id, name)
```

`profiles` also gets `onboarding_completed_at timestamptz`. It's set when the first property and its units are saved; the app routes to onboarding while it's null. Onboarding (property + all its units) is saved by one Postgres function, `create_property_with_units(property jsonb, unit_groups jsonb)`, so a half-created property never exists.

**tenants**
```
id, landlord_id, full_name, phone, alt_phone, member_count int check (1..20),
permanent_address, occupation, emergency_name, emergency_phone,
aadhaar_last4 char(4), household_members jsonb  -- P1
```

**tenancies**
```
id, landlord_id, tenant_id → tenants, unit_id → units,
shift_date date, move_out_date date, status ('active'|'on_notice'|'ended'),
monthly_rent int, rent_due_day smallint check (1..31), first_due_date date,
advance_agreed int default 0, notice_period_days smallint default 30 check (0..180)
unique (unit_id) where status in ('active', 'on_notice')
```

**move_out_notices** (one row per notice; at most one open notice per tenancy)
```
id, landlord_id, tenancy_id → tenancies, given_by ('tenant'|'landlord'),
notice_date date, planned_move_out_date date, reason text,
is_short_notice bool, short_by_days smallint,
status ('open'|'withdrawn'|'completed'), withdrawn_at timestamptz, completed_at timestamptz
unique (tenancy_id) where status = 'open'
check (planned_move_out_date >= notice_date)
```

**agreements** (one row per agreement period; the latest is current)
```
id, landlord_id, tenancy_id → tenancies, start_date, term_months smallint,
end_date date, reminder_date date,  -- = end_date unless rescheduled
renewed_at timestamptz
```

**rent_revisions** (P1, AGR-4; `tenancies.monthly_rent` is always the current rent)
```
id, landlord_id, tenancy_id → tenancies, old_rent int, new_rent int,
effective_from date, applied_at timestamptz
```

**rent_charges**
```
id, landlord_id, tenancy_id → tenancies, period_month date (first of month),
amount_due int, original_due_date date, due_date date,
waived_amount int default 0, waive_reason text
unique (tenancy_id, period_month)
```

**payments**
```
id, landlord_id, tenancy_id → tenancies, rent_charge_id → rent_charges (null for advance),
kind ('rent'|'advance'), amount int check (> 0), paid_on date,
mode ('cash'|'upi'|'bank'|'cheque'|'from_advance'|'other'),
reference, note, voided_at, void_reason
```

**date_changes** (reschedule history for rent charges, agreements and planned move-out dates)
```
id, landlord_id, rent_charge_id null, agreement_id null, notice_id null,
old_date, new_date, reason
check (exactly one of rent_charge_id, agreement_id, notice_id is set)
```

**documents**
```
id, landlord_id, tenant_id → tenants, doc_type, label, storage_path,
mime_type, size_bytes, upload_status ('pending'|'uploaded'|'failed')
```

**notes**
```
id, landlord_id, tenant_id → tenants, tenancy_id null, kind, body, pinned bool,
is_system bool
```

**notifications** (sent reminders, also the in-app inbox)
```
id, landlord_id, category ('rent'|'agreement'|'move_out'|'summary'),
type ('rent_due'|'rent_overdue'|'rent_rescheduled_due'|'agreement_due'|
      'move_out_upcoming'|'move_out_today'|'move_out_pending'|'summary'),
tenancy_id null, rent_charge_ids uuid[], agreement_id null, notice_id null,
for_date date, title, body, data jsonb,
status ('queued'|'sent'|'failed'), expo_ticket_ids text[], error, read_at
unique (landlord_id, tenancy_id, category, for_date)  -- one per tenant per category per day
```

**Derived values** (Postgres views, so app and server use the same rules):

- `rent_charge_balances`: per charge, `paid` (sum of non-voided payments), `outstanding = amount_due − paid − waived_amount`, and `status` from the table in [§7.5](#75-rent-and-payments), using the landlord's timezone for "today".
- `tenancy_summaries`: per tenancy, total outstanding, next due date and amount, last payment date and amount, advance received, advance pending, advance balance, days overdue, notice status and planned move-out date.
- `rent_charge_history`: per charge, `settled_on` (the date cumulative non-voided payments first reached `amount_due − waived_amount`), `days_late` (`settled_on − original_due_date`, or today − original date if unsettled), `payment_count`, `was_rescheduled`, `promise_kept`, and `result` (on_time, late_promise_kept, late, waived, unpaid, not_due) per [Payment history](#payment-history).
- `tenancy_payment_stats`: per tenancy, over the last 12 months and since move-in: months on time, months late, average and longest delay, promises kept vs made, total paid, total paid this financial year, total waived, and the payment habit label (HIST-7).

**Row Level Security.** Enabled on every table. Policy on all tables: a row is visible and writable only when `landlord_id = auth.uid()` (`id = auth.uid()` on `profiles`). Edge Functions use the service role and must filter by `landlord_id` themselves.

**Storage.** Bucket `tenant-documents`, private. Object path: `{landlord_id}/{tenant_id}/{document_id}.{ext}`. Storage policies allow read, insert, update and delete only when the first path segment equals `auth.uid()`. Bucket file size limit 10 MB; allowed MIME types `image/jpeg`, `image/png`, `application/pdf`.

**Transactions.** Creating a tenant (TEN-2), recording a payment split across months (RENT-2), ending a tenancy (OUT-3), recording or withdrawing notice (NOTICE-2, NOTICE-8) and renewing an agreement run as Postgres functions called with `supabase.rpc`, so each is all-or-nothing.

### 9.4 Scheduled jobs

| Job | Schedule | What it does |
|-----|----------|--------------|
| `generate_rent_charges()` | Daily, 00:05 IST (pg_cron, SQL) | For each Active or On-notice tenancy, creates any missing charges from `first_due_date` up to today + 31 days, never with a due date after the open notice's `planned_move_out_date` or the `move_out_date`. Due date = `rent_due_day` in that month, or the month's last day if shorter. Amount = current monthly rent. Idempotent through `unique (tenancy_id, period_month)`. Also called right after a tenant is created. |
| `send-reminders` | Every 15 minutes (pg_cron → pg_net → Edge Function) | Picks landlords whose local time has passed `reminder_time` and whose `last_reminder_run_on` is before their local today. For each: selects due-today, overdue, rescheduled-due, agreement-due and move-out items per [§8.1](#81-when-reminders-are-sent); inserts `notifications` rows (unique keys prevent duplicates); sends them to all of the landlord's tokens via the Expo Push API in batches of up to 100; stores ticket IDs; sets `last_reminder_run_on`. Retries 429 and 5xx with exponential backoff. |
| `check-push-receipts` | Every 30 minutes | Fetches receipts for tickets older than 15 minutes (up to 1,000 IDs per request; Expo clears receipts after 24 hours). Marks failures, and deletes tokens that return `DeviceNotRegistered`. |
| Inbox cleanup | Daily | Deletes `notifications` rows older than 90 days. |

Secrets (project URL, service key, Expo access token) are kept in Supabase Vault and Edge Function secrets, never in the app. Enable Expo's enhanced push security so only our server can send to our tokens. Note: `pg_net` stores request headers in `net.http_request_queue`; restrict database roles so the service key can't be read from there.

### 9.5 App structure (Expo Router)

```
src/app/
  _layout.tsx                 root: auth gate, onboarding gate, notification tap handling, providers
  (auth)/
    sign-in.tsx
    sign-up.tsx
    forgot-password.tsx
    reset-password.tsx
  onboarding/
    _layout.tsx               stack with no back-out until done
    index.tsx                 welcome
    location.tsx              property name and location
    units.tsx                 unit types, counts, rent
    review.tsx                review generated units, save
  (app)/
    (tabs)/
      _layout.tsx             tabs: Today, Tenants, Properties, Settings
      index.tsx               Today
      tenants.tsx
      properties.tsx
      settings.tsx
    reminders.tsx             in-app inbox
    tenants/
      new.tsx                 add-tenant steps
      [id]/index.tsx          tenant detail
      [id]/edit.tsx
      [id]/payments.tsx       payment history: summary, month list, all payments
      [id]/move-out.tsx       end tenancy and settlement
      [id]/documents/[docId].tsx   full-screen viewer
    properties/
      new.tsx                 same location + units steps as onboarding (shared components)
      [id]/index.tsx          units grouped as vacant / occupied
      [id]/edit.tsx
      [id]/units/new.tsx      add more units
      [id]/units/[unitId].tsx edit a unit
```

The root layout decides where a signed-in landlord goes: if `profiles.onboarding_completed_at` is null, to `onboarding/`; otherwise to `(app)/`. A notification tap during onboarding waits until onboarding is finished.

Record payment, Reschedule, Use advance, Renew agreement, Record notice, Change move-out date, Withdraw notice and Add note are bottom sheets over the tenant detail or Today screen, not separate routes. Non-route code (Supabase client, hooks, components, formatting) lives outside `src/app/`.

### 9.6 New native packages

Install with `bunx expo install`, then rebuild the development build:

- `expo-notifications`: push tokens, channels, tap handling. Add its config plugin to `app.json` with the notification `icon` and `color`.
- `expo-image-picker`: camera and gallery. Set the `cameraPermission` text in its config plugin, e.g. "RMS uses the camera to photograph tenant ID documents."
- `expo-document-picker`: PDFs and images from files.

Also needed: an EAS project ID in `app.json` (`extra.eas.projectId`), FCM credentials uploaded to EAS for Android, and an APNs key for iOS.

---

## 10. Key user flows

### 10.1 First launch

1. Sign up with name, email, password.
2. Onboarding opens straight away: "Let's set up your property. You'll add tenants after this."
3. **Location**: "Shanti Niwas", 12 MG Road, Shankar Nagar, Raipur, 492007.
4. **Rooms and rent**: adds three rows: 1BHK × 3 at ₹8,000; 2BHK × 2 at ₹12,000; Single room × 4 at ₹4,500.
5. **Review**: sees 9 units (1BHK 1–3, 2BHK 1–2, Single room 1–4), renames "2BHK 1" to "Flat 201", saves. Total shown: ₹63,000 a month if fully rented.
6. **Done**: "Add another property" or "Add your first tenant". All 9 units are Vacant.
7. Choosing "Add your first tenant" opens add-tenant with only those vacant units to pick from, and the chosen unit's rent pre-filled.

### 10.2 Add a tenant (target: under 3 minutes)

1. **Person**: name, phone, members.
2. **Unit and rent**: property, vacant unit (shown with type and asking rent), shift date, monthly rent (pre-filled from the unit), due day. For a past shift date, "When is their next rent due?".
3. **Advance and agreement**: advance agreed, advance received now (mode), agreement start, term (11 months), end date shown, notice period (30 days).
4. **Documents**: Aadhaar front and back (camera), or Aadhaar PDF (files). "Skip for now" available.
5. **Review** and save. The first rent charge is created.
6. If this is the first tenant, ask for notification permission (NOTIF-10).

### 10.3 Collecting rent from a reminder

1. 9:00 AM, 2 Nov: "Collect rent from Ravi Kumar. ₹8,000 for November rent, Flat 2B, Shanti Niwas. Last paid ₹8,000 on 2 Oct."
2. Tap. Ravi's screen opens with Record payment prefilled at ₹8,000.
3. Ravi pays ₹5,000 cash. Landlord changes the amount to 5,000, mode Cash, Save.
4. November shows "Partly paid, ₹3,000 left". Tomorrow at 9:00 the landlord gets "Ravi Kumar's rent is 1 day overdue: ₹3,000…"

### 10.4 Tenant asks for more time

1. On the 9th, the tenant calls: "I'll pay on the 11th, not the 10th."
2. Landlord opens the tenant, taps Reschedule on November, picks 11 Nov, types "Salary on 11th", saves.
3. Note added automatically. No reminder on the 10th. On the 11th: "Collect rent from … today. ₹8,000 for November, moved from 10 Nov."

### 10.5 Agreement renewal

1. On the renewal date: "Ravi Kumar's agreement ends today."
2. Landlord opens the Agreement section, taps Renew, keeps 11 months, optionally sets new rent from next month.
3. Renewal reminders stop. The next renewal date is 11 months later.

### 10.6 Tenant gives notice

1. 1 Nov: Ravi tells the landlord he's leaving because of a job transfer.
2. Landlord opens Ravi → Record notice. Given by: Tenant. Notice date: today. Planned move-out: 30 Nov (pre-filled from the 30-day notice period). Reason: "Job transfer to Pune".
3. The sheet shows Ravi's payment summary ("On time 8 of 11 months") and what's left to collect before 30 Nov.
4. Save. Ravi shows "Leaving 30 Nov" and Flat 2B shows "Available from 1 Dec". No December rent charge will be created. Agreement renewal reminders stop.
5. 27 Nov: "Ravi Kumar leaves Flat 2B on 30 Nov. Settle before he goes…"
6. If Ravi changes his mind, the landlord taps Withdraw notice and everything carries on as before.

### 10.7 Move-out

1. 30 Nov: "Ravi Kumar is moving out today." Tap → End tenancy, with 30 Nov pre-filled.
2. Settlement: outstanding ₹3,000, advance balance ₹8,000 → "Use ₹3,000 from advance. Refund due to tenant: ₹5,000."
3. Confirm. Unit is vacant, reminders stop, tenant moves to "Moved out".

---

## 11. Edge cases

| Case | Behaviour |
|------|-----------|
| Landlord closes the app during onboarding | Reopens at the same onboarding step with their draft. Nothing is saved to the server until Review. |
| Landlord signs in on a new phone after onboarding | Goes straight to the app; onboarding status is stored on the server, not the phone. |
| Landlord types count 0 or rent ₹0 for a unit type | Save is blocked with "Enter at least 1 unit" / "Enter the monthly rent". |
| Unit's rent raised while a tenant lives there | The tenant's rent doesn't change. The new rent is used for the next tenant. To change the current tenant's rent, edit the tenancy or renew the agreement. |
| Due day 31 in a 30-day month or February | Due on the month's last day (30 Nov, 28 or 29 Feb). |
| Tenant added with a shift date years ago | No back charges. Charges start at "next rent due" (see [§7.3](#73-tenants)). |
| Rent changed mid-month | Existing charges keep their amount. New charges use the new rent. The landlord can edit the current charge by hand. |
| Payment bigger than total outstanding | Ask: keep the extra as advance balance, or reduce the amount (RENT-3). |
| Payment recorded for a future month | Allowed by picking that month explicitly. The charge is created if it doesn't exist yet. |
| Rescheduled to a date after the next month's due date | Allowed, with a warning that the next month's rent will also fall due before then. |
| Multiple unpaid months | One overdue notification per tenant with the total (see [§8.2](#82-notification-content)), not one per month. |
| Reminder time changed after today's run | Takes effect from tomorrow. |
| Landlord has two phones | Both get reminders. Signing out on one removes only that phone's token. |
| Push permission denied | In-app inbox still fills. Banner explains how to turn notifications on. |
| Reminder job fails or runs late | Next 15-minute run picks it up because `last_reminder_run_on` was not updated. Unique keys stop duplicate sends. |
| Tenant pays after the morning reminder | No further reminder that day. The next day's run sees the charge as paid and sends nothing. |
| Tenant moved out with dues | No more reminders (OUT-3). Shown under "Dues after move-out" (P1). |
| Notice given, planned move-out a few days after a rent due date | That month's charge is still created and reminded in full. Pro-rating the last month is done by editing the charge at settlement (RENT-6). |
| Planned move-out date passes but the tenant is still there | Daily "Move-out pending" reminders until the landlord ends the tenancy or moves the date. No new rent charges are created; if the stay is long, the landlord moves the date and charges resume. |
| Tenant on notice gives a new, later date | Change move-out date (NOTICE-7). Charges up to the new date are created by the next daily job. |
| Notice recorded, then withdrawn | Tenancy back to Active. Charges that were skipped are created by the next daily job. Withdrawn notice stays in history. |
| Landlord records notice with notice date in the past | Allowed. Short-notice check uses that past date. |
| Payment for a rescheduled month made after the new date too | Counted as "Late", and the promise counted as not kept. |
| A month paid partly from advance | Settled date is when the "From advance" payment completed it; counted like any payment. |
| Tenant has fewer than 3 settled months | Payment history shows the months, but no habit label (HIST-7). |
| Document upload fails on bad network | Tenant is saved; document shows "Upload failed, tap to retry" (DOC-7). |
| Two tenants added to the same unit at the same time | Database unique constraint rejects the second; app shows "This unit already has a tenant." |
| No internet | App shows the last loaded data read-only with an "Offline" banner. Saving is disabled until online. |

---

## 12. Non-functional requirements

### Performance
- Today screen and tenant list load in under 2 seconds on a mid-range Android phone on 4G, for a landlord with 100 tenants.
- Lists of 100+ tenants scroll smoothly (virtualized list).
- Recording a payment takes no more than 4 taps from a notification.

### Reliability
- Reminders are sent within 30 minutes of the landlord's reminder time on 99% of days.
- No reminder is sent twice for the same charge on the same day.
- Money values in the app always match the database views; the app never calculates outstanding on its own.

### Security and privacy
- Aadhaar is sensitive personal data under the Aadhaar Act and India's Digital Personal Data Protection Act 2023. RMS stores it only for the landlord's own tenant verification.
- Documents are in a private bucket, served only through 5-minute signed URLs, and never logged.
- Only the last 4 Aadhaar digits are stored as text.
- RLS on every table and storage object; the service key never ships in the app.
- Data is encrypted in transit (HTTPS) and at rest (Supabase default).
- Deleting a document, tenant or account deletes the stored files, not just the database rows.
- The privacy policy (needed for store listings) states what is stored, why, and how to delete it.

### Usability and accessibility
- Built for one-handed use; primary actions sit in the lower half of the screen.
- Touch targets at least 44 × 44 pt. Text respects the system font size.
- Light and dark mode (`userInterfaceStyle: automatic`).
- Indian formats everywhere: ₹ with Indian digit grouping, dates as "2 Nov 2026", phone numbers as +91.
- Plain words in the UI: "Collect rent", "Moved out", not "Tenancy status: ended".

### Compatibility
- Android 8.0+ and iOS versions supported by Expo SDK 58.
- Portrait only (as set in `app.json`).

---

## 13. Success metrics

| Metric | Target 3 months after launch |
|--------|------------------------------|
| Landlords who record at least one payment a week | 70% of active landlords |
| Rent charges paid by their due date (or rescheduled date) | Up 20% from the landlord's first month |
| Reminder notifications opened | 40%+ |
| Tenants with an Aadhaar document | 80%+ of active tenants |
| Median time to add a tenant | Under 3 minutes |
| Crash-free sessions | 99.5%+ |

---

## 14. Milestones

| Milestone | Scope | Exit criteria |
|-----------|-------|---------------|
**Push notifications come after the MVP.** The MVP (M1 to M4) is the full app without push: the Today screen is how the landlord sees who to collect from. Push (M5) is added once the MVP works, because it needs Firebase set up (`google-services.json`) and a new development build.

| Milestone | Scope | Exit criteria |
|-----------|-------|---------------|
| M1. Foundation | Supabase project, schema, RLS, storage bucket, auth screens, tab layout, EAS dev build | Landlord can sign up and sign in on a dev build on Android |
| M2. Properties and tenants | Onboarding (location, unit types, counts, rent), properties and units screens, add/edit tenant, documents upload and viewer, notes | A new landlord finishes onboarding with 9 units in under 2 minutes, then adds 10 tenants with Aadhaar photos and PDFs |
| M3. Rent and advance | Charge generation job, payments with partial and from-advance, reschedule, Today screen | Ledger matches hand calculations for 20 test scenarios, including all §11 edge cases |
| M4. Agreement, notice, move-out, history, polish (**MVP complete**) | Renewals, notice period and planned move-out, settlement, payment history, settings, empty states, delete account | Usability test with one real landlord; no P0 bugs |
| M5. Push notifications | Firebase + `google-services.json`, new dev build, push tokens, channel, `send-reminders`, receipts, in-app reminders inbox, tap routing, move-out reminders | Reminders arrive for due, overdue, rescheduled, agreement and move-out cases over 7 real days |
| M6. Release | Privacy policy, store listings, production EAS builds, `eas submit` | Live on Play Store (and App Store if decided) |

---

## 15. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Push doesn't arrive (battery savers on Xiaomi, Oppo, Vivo phones) | Landlord misses rent | High-importance channel; in-app inbox as backup; onboarding tip to allow RMS in battery settings |
| Storing Aadhaar creates legal and trust risk | Store rejection, user distrust | Private storage, last-4 only as text, delete on move-out (OUT-6), clear privacy policy |
| Wrong "today" because of timezone | Reminders a day early or late | All date logic in Postgres using the landlord's timezone, covered by tests |
| Payment split logic bugs | Wrong outstanding amounts | One Postgres function owns the logic; scenario tests in M3 |
| Supabase free tier pauses inactive projects | Reminders stop | Use a paid plan for production, or confirm the scheduled jobs keep the project active |
| Expo Go can't test push on Android | Slower development | Use a development build from M1 |

---

## 16. Open questions

These need an answer from the product owner. The PRD's current assumption is in brackets.

1. **Shared rooms / PGs.** Can one unit have more than one active tenant, each paying their own rent? [No. One tenant per unit; add each bed as a unit if needed.]
2. **How advance rent is used.** Is it used for the last month(s) before move-out, the first month(s), or whenever the landlord decides? [Whenever the landlord decides with "Use advance"; offered automatically at move-out.]
3. **Agreement renewal reminders after the date.** Remind every 7 days until renewed, or daily like rent? [Every 7 days.]
4. **Reminders before the due date.** Should there be an optional heads-up 1 to 3 days before? [Not in v1; easy to add as a setting.]
5. **Language.** Is Hindi needed in v1, for the UI and for notification text? [English only in v1, with all text kept in one place so Hindi can be added.]
6. **iOS at launch.** Release on both stores at once, or Android first? [Android first; iOS when M6 is stable.]
7. **Rent receipts.** Do tenants need a receipt (PDF or WhatsApp message) when they pay? [P2.]
8. **Late fees.** Is there ever a late-payment fine? [No.]
9. **Data export.** Does the landlord need an Excel/CSV export for their CA or records? [P2.]
10. **More unit details.** Should a unit also record furnishing (furnished / semi / unfurnished), area in sq ft, or attached bathroom? [Not in v1; type, floor and rent only.]
11. **Unit types.** Is the list Single room, 1RK, 1BHK, 2BHK, 3BHK, 4BHK+, Shop, Other complete for your properties? [Yes.]
12. **Default notice period.** Is 30 days right for most of your tenants? [Yes, editable per tenant.]
13. **Short notice.** When a tenant leaves early, do you charge rent for the missing notice days? [Optional per move-out, P1.]
14. **"On time" with a grace period.** Should paying within a few days of the due date (e.g. by the 5th) still count as on time in payment history? [No grace period in v1; on time means by the due date.]
