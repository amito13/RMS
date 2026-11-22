# RMS database

Generated from the migrations in `supabase/migrations/` (13 Nov 2026). The diagrams render on GitHub and in VS Code with a Mermaid preview.

## Entity relationship diagram

Every table except `profiles` also has `landlord_id → auth.users.id`, and Row Level Security only shows a landlord their own rows. To keep the diagram readable, that link is drawn only for `properties` and `tenants`. Child tables reference their parent by `(id, landlord_id)`, so a row can never point at another landlord's data.

```mermaid
erDiagram
    auth_users ||--|| profiles : "has"
    auth_users ||--o{ properties : "owns"
    auth_users ||--o{ tenants : "rents to"
    properties ||--|{ units : "contains"
    units ||--o{ tenancies : "is rented as"
    tenants ||--o{ tenancies : "stays in"
    tenancies ||--|{ agreements : "has periods"
    tenancies ||--o{ rent_revisions : "rent changes"
    tenancies ||--o{ rent_charges : "owes monthly"
    tenancies ||--o{ payments : "receives"
    rent_charges |o--o{ payments : "settled by"
    tenancies ||--o{ move_out_notices : "gets notice"
    rent_charges ||--o{ date_changes : "rescheduled"
    agreements ||--o{ date_changes : "renewal moved"
    move_out_notices ||--o{ date_changes : "move-out moved"
    tenants ||--o{ documents : "verified by"
    tenants ||--o{ notes : "timeline"
    tenancies |o--o{ notes : "about"
    documents }o..|| storage_objects : "file in bucket"

    auth_users {
        uuid id PK
        text email
        jsonb raw_user_meta_data
    }
    profiles {
        uuid id PK "= auth.users.id"
        text full_name
        text timezone "Asia/Kolkata"
        time reminder_time "09:00"
        bool remind_due_today
        bool remind_overdue
        bool remind_agreement
        bool remind_move_out
        smallint default_notice_period_days "30"
        timestamptz onboarding_completed_at
        date last_reminder_run_on
    }
    properties {
        uuid id PK
        uuid landlord_id FK
        text name
        text address_line
        text locality
        text city
        text pincode "6 digits"
        numeric latitude
        numeric longitude
        text notes
        timestamptz archived_at
    }
    units {
        uuid id PK
        uuid landlord_id FK
        uuid property_id FK
        text name UK "unique in property"
        text unit_type "single_room 1rk 1bhk 2bhk 3bhk 4bhk_plus shop other"
        text type_label "when other"
        text floor
        int monthly_rent "asking rent"
        timestamptz archived_at
    }
    tenants {
        uuid id PK
        uuid landlord_id FK
        text full_name
        text phone "+91 and 10 digits"
        text alt_phone
        smallint member_count "1 to 20"
        text permanent_address
        text occupation
        text emergency_name
        text emergency_phone
        text aadhaar_last4 "last 4 only"
        jsonb household_members
    }
    tenancies {
        uuid id PK
        uuid landlord_id FK
        uuid tenant_id FK
        uuid unit_id FK "one current per unit"
        date shift_date "move-in"
        date move_out_date
        text status "active on_notice ended"
        int monthly_rent
        smallint rent_due_day "1 to 31"
        date first_due_date
        int advance_agreed
        smallint notice_period_days "30"
    }
    agreements {
        uuid id PK
        uuid landlord_id FK
        uuid tenancy_id FK
        date start_date
        smallint term_months "11"
        date end_date
        date reminder_date "renewal date"
        timestamptz renewed_at
    }
    rent_revisions {
        uuid id PK
        uuid landlord_id FK
        uuid tenancy_id FK
        int old_rent
        int new_rent
        date effective_from
    }
    rent_charges {
        uuid id PK
        uuid landlord_id FK
        uuid tenancy_id FK
        date period_month UK "one per month"
        int amount_due
        date original_due_date
        date due_date "after reschedule"
        int waived_amount
        text waive_reason
    }
    payments {
        uuid id PK
        uuid landlord_id FK
        uuid tenancy_id FK
        uuid rent_charge_id FK "null for advance"
        text kind "rent advance"
        int amount
        date paid_on
        text mode "cash upi bank cheque from_advance other"
        text reference
        text note
        timestamptz voided_at
        text void_reason
    }
    move_out_notices {
        uuid id PK
        uuid landlord_id FK
        uuid tenancy_id FK "one open per tenancy"
        text given_by "tenant landlord"
        date notice_date
        date planned_move_out_date
        text reason
        bool is_short_notice
        smallint short_by_days
        text status "open withdrawn completed"
    }
    date_changes {
        uuid id PK
        uuid landlord_id FK
        uuid rent_charge_id FK "exactly one of"
        uuid agreement_id FK "these three"
        uuid notice_id FK
        date old_date
        date new_date
        text reason
    }
    documents {
        uuid id PK
        uuid landlord_id FK
        uuid tenant_id FK
        text doc_type "aadhaar_front aadhaar_back aadhaar_pdf pan rental_agreement police_verification photo other"
        text label
        text storage_path UK "landlord/tenant/doc.ext"
        text mime_type "jpeg png pdf"
        int size_bytes "max 10 MB"
        text upload_status "pending uploaded failed"
    }
    notes {
        uuid id PK
        uuid landlord_id FK
        uuid tenant_id FK
        uuid tenancy_id FK
        text kind "general payment_promise renewal complaint reschedule rent_change waiver notice move_out"
        text body
        bool pinned
        bool is_system "written by the app"
    }
    storage_objects {
        text bucket_id "tenant-documents"
        text name "landlord_id/tenant_id/document_id.ext"
    }
```

All tables also have `created_at`, and all except `rent_revisions` and `date_changes` have `updated_at` (set by a trigger).

## Views (calculated, read-only)

Views use `security_invoker`, so they follow the same Row Level Security as the tables.

```mermaid
flowchart LR
    rent_charges[(rent_charges)] --> rcb[rent_charge_balances<br/>paid, outstanding, status, days overdue]
    payments[(payments)] --> rcb
    rcb --> rch[rent_charge_history<br/>settled on, on time / late / promised,<br/>days late, promise kept]
    rch --> tps[tenancy_payment_stats<br/>months on time vs late, avg and longest delay,<br/>promises kept, totals, payment habit]
    rcb --> ts[tenancy_summaries<br/>tenant + unit + property, outstanding, next due,<br/>last paid, advance, agreement, notice, has Aadhaar, latest note]
    tenancies[(tenancies)] --> ts
    tenants[(tenants)] --> ts
    agreements[(agreements)] --> ts
    move_out_notices[(move_out_notices)] --> ts
    documents[(documents)] --> ts
    notes[(notes)] --> ts
    units[(units)] --> uo[unit_occupancy<br/>vacant / occupied, tenant, available from]
    tenancies --> uo
```

## Functions the app calls (`supabase.rpc`)

| Function | Does |
|----------|------|
| `create_property_with_units(property, units)` | Onboarding: a property and all its units; marks onboarding complete |
| `create_tenant(tenant, tenancy, agreement, advance)` | Tenant + tenancy + agreement + advance payment + first rent charges |
| `record_payment(tenancy, amount, …)` | Pays oldest month first; extra kept as advance or error `R0001`; `from_advance` mode |
| `reschedule_rent_charge(charge, new_date, reason)` | Moves one month's due date, keeps history, adds a note |
| `waive_rent_charge(charge, reason)` | Waives what's left of a month |
| `renew_agreement(tenancy, start, term, new_rent, effective_from)` | New agreement period, optional rent change |
| `reschedule_agreement(agreement, new_date, reason)` | Moves the renewal date |
| `record_notice(tenancy, given_by, notice_date, planned_move_out, reason)` | Tenancy goes on notice, flags short notice, drops later months |
| `change_move_out_date(tenancy, new_date, reason)` | Moves the planned move-out date |
| `withdraw_notice(tenancy, reason)` | Tenant stays; tenancy active again |
| `end_tenancy(tenancy, move_out_date, use_advance, waive_remaining, reason)` | Settles with advance, ends tenancy, frees the unit |
| `generate_rent_charges(tenancy?)` | Creates upcoming monthly rent; daily via pg_cron, and on app open |
| `delete_my_account()` | Deletes the signed-in landlord's account; every table cascades. The app deletes their storage files first. |

Helpers used inside them: `landlord_today`, `due_date_in_month`, `format_day`, `add_system_note`, `remove_charges_after`.
