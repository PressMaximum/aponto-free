=== Appointment Booking & Scheduling Calendar – Aponto ===
Contributors: pressmaximum
Tags: appointment booking, appointments, booking, scheduling, booking calendar
Requires at least: 6.6
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 1.0.3
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Appointment booking for salons, clinics, coaches and studios. Timezone-correct slots, email reminders, Stripe payments and a mobile booking form.

== Description ==

Aponto lets customers book appointments on your WordPress site around the clock, without a single back-and-forth email. Add your services, set your working hours, drop the booking form on any page, and your customers pick a time that suits them, in their own timezone, from any phone.

It is built for the solo professional and the small studio: one owner, a handful of services, a calendar that has to be right every single time. The free plugin has no booking cap, no service cap, no license key and no locked code. Card payments through Stripe are included.

= Why Aponto =

* **Timezones that never disagree.** Remote customers book in their own timezone while you work in yours, and the slot picker, summary, confirmation, manage page and every email all show the same appointment. No more "I thought it was 3 pm my time".
* **Stripe payments in the free plugin.** Take card payments on the booking form itself. No upgrade, and no fee from us on top of Stripe's own. Payment can be optional or required.
* **Set up in one sitting.** The setup wizard reads your site title, admin email, timezone and date formats so you only confirm them, then walks you through working hours, your first service, and creating the booking page.
* **Feels like WordPress.** The booking form is a native block for the block editor and Full Site Editing, with a live preview while you edit. Its assets load only on pages that show a form.
* **Privacy handled where you expect it.** Personal-data export and erase run through the WordPress tools you already know, with optional retention-based anonymization and a consent checkbox on the form.
* **Unlimited where it counts.** Unlimited bookings and unlimited services in the free plugin. The only limits are one staff member and one business location.

= Who is Aponto for =

* **Hair and beauty salons** – let clients book a cut, colour or treatment while you are busy with the chair in front of you.
* **Barbershops and nail studios** – short services, tight slots and no double bookings, so the chair keeps turning.
* **Clinics, therapists and wellness practitioners** – private, dependable scheduling with confirmations, reminders and a cancellation link that keeps your calendar accurate.
* **Coaches and consultants** – sell discovery calls and sessions to clients anywhere in the world, each booking in the client's own timezone.
* **Tutors and instructors** – offer lessons at set lengths and let students book the next one themselves.
* **Personal trainers and small fitness studios** – fill one-to-one sessions without a chat thread for every booking.
* **Photographers, tattoo artists and creative studios** – consultations and sittings, paid up front with Stripe if you want them to be.
* **Freelancers and small agencies** – a booking page that takes payment, so meetings turn into paid work.

= Everything in the free plugin =

**Booking form**

* Mobile-first booking form as a native block, with a live preview in the editor.
* A short path: service, date and time, customer details, payment if you ask for it, then confirmation.
* Pre-select a service per form and place as many forms as you like across the site.
* Optional consent checkbox and a clear summary before the customer confirms.
* Add to calendar on the confirmation screen: a Google Calendar link and an `.ics` download.

**Availability and scheduling**

* Unlimited services, grouped into categories, each with its own duration and price.
* Weekly working hours, date overrides and days off for your staff member.
* Timezone-correct slots everywhere, with an automatic timezone selector when the customer is somewhere else.
* Booking statuses that match real life: pending, confirmed, completed, cancelled and no-show, with guarded transitions so a slot is never double-sold on the way back from a cancellation.

**Notifications**

* Thirteen editable email templates: booking received, confirmed, rescheduled, cancelled, completed and no-show for the customer, plus new-booking and cancellation notices for you and your staff member.
* An appointment reminder emailed to the customer about 24 hours before a confirmed booking, on by default.
* A "complete your payment" email for an unpaid booking, and a refund notice you can switch on.
* Switch any template on or off and edit the subject and body in the admin. The completed, no-show and refund emails ship switched off, so upgrading a live site never surprises your customers.

**Manage your day**

* A dashboard with a week and day calendar of your appointments.
* A bookings list with search, status, service and date-range filters, and per-row actions.
* Manual bookings and admin reschedule for customers who call or walk in.
* Customer records with contact details, an internal note, and totals for bookings, upcoming appointments, last visit and no-shows.
* Customer self-service cancellation through a secure link in their email.
* Mark bookings paid or unpaid, and refund a Stripe payment from the booking itself.

**Payments**

* Card payments through your own Stripe account, on the booking form, without leaving your site.
* Test and Live mode with separate keys, so you can try everything before going live.
* Optional or required payment, your choice.
* A customer who did not finish paying can come back and pay from the "complete your payment" email or their manage-booking page, until the hold expires.

**Data and privacy**

* CSV export of bookings and customers, Excel-compatible and protected against spreadsheet formula injection.
* WordPress personal-data export and erase integration.
* Optional time-based anonymization of old bookings.
* Your data stays in your database when you uninstall, unless you choose otherwise.

**Fits your site**

* Works with any well-built theme, in the block editor and Full Site Editing.
* Translation-ready: a Vietnamese translation is bundled, WordPress language packs take precedence once they exist, and the admin ships RTL stylesheets.
* Runs on MySQL, MariaDB or the official WordPress SQLite integration.
* Lightweight: the booking form only loads its assets on pages that render it.

= How it works =

1. Install and activate Aponto, then follow the setup wizard to confirm your business details.
1. Set your working hours and add your first service with its duration and price.
1. Add the Aponto Booking Form block to a page, or let the wizard create the booking page for you.
1. Customers book, pay if you ask them to, and both of you get an email. You see everything on the calendar.

= Aponto Premium =

The free plugin is the whole product for a single-staff business. Aponto Premium is in development, runs on the same database as the free plugin, and adds:

* More staff members, each with their own working hours, days off and service assignments.
* Google Calendar and Outlook sync: a booking is written to the staff member's calendar, and what is already on that calendar blocks the times Aponto offers.
* Custom reminder schedules with several reminders and follow-ups instead of the single 24-hour one.
* Custom booking-form fields, so you collect the details your work actually needs.
* PayPal alongside Stripe.

Further modules are planned, including deposits, coupons, video meeting links, group bookings, recurring appointments, multiple locations and SMS reminders. Premium is not on sale yet; the Modules screen inside the plugin lists every module and marks it as included, Premium or planned, and nothing there is required to run the free plugin.

Learn more about PressMaximum and Aponto at [pressmaximum.com](https://pressmaximum.com/).

= Support =

Questions, bugs and feature requests are welcome on the [WordPress.org support forum](https://wordpress.org/support/plugin/aponto/). You can also reach the team through [pressmaximum.com/support](https://pressmaximum.com/support/).

= Source code =

The complete human-readable JavaScript and CSS source ships with the plugin under `assets/src/`, together with the build configuration. A public mirror of every free release lives at [github.com/PressMaximum/aponto-free](https://github.com/PressMaximum/aponto-free); its `README.md` documents the source-to-bundle map and the exact rebuild commands.

== Installation ==

1. Install Aponto from Plugins → Add New, or upload the plugin ZIP through Plugins → Add New → Upload Plugin.
1. Activate Aponto through the Plugins screen.
1. Open Aponto in the admin menu and follow the setup wizard: confirm your business info, set working hours, and create your first service.
1. Add the "Aponto Booking Form" block to any page, or let the wizard create a booking page for you.

== Frequently Asked Questions ==

= Is the free plugin really free? What is the catch? =

There is no catch. The free plugin has unlimited bookings, unlimited services, Stripe payments, email notifications, a 24-hour reminder and the full admin, with no license key and no locked code. The only limits are one staff member and one business location. Premium is for businesses that outgrow those limits.

= Can I buy Aponto Premium today? =

Not yet. Premium is still in development, so there is nothing to purchase and nothing to activate. The free plugin is complete on its own, and the Modules screen inside the plugin shows what is included today and what is still to come.

= Do I need any coding skills? =

No. The setup wizard walks you through your business details, working hours and first service, and can create the booking page for you. Everything else is configured from the Aponto admin screens.

= How do customers book? =

Add the Aponto Booking Form block to a page. Customers pick a service, choose a date and time, enter their details, pay if you require it, and confirm. Both the customer and you get an email, and the booking appears on your calendar.

= Does it handle timezones correctly? =

Yes. When a customer's browser timezone differs from your business timezone, the form shows a timezone selector and books in the customer's timezone, while you always see the business timezone in the admin. Every surface the customer sees, from the slot picker to the confirmation email, uses the same timezone, so nothing disagrees.

= Can customers pay online? =

Yes. Card payments through your own Stripe account are included in the free plugin: turn on the Stripe module, paste your Stripe keys, and customers pay on the booking form itself. You choose whether payment is optional or required, you can mark bookings paid or unpaid by hand, and you can refund a Stripe payment from the booking. PayPal belongs to Aponto Premium; deposits and coupons are planned.

= Do customers get a reminder before their appointment? =

Yes. Aponto emails the customer about 24 hours before a confirmed booking. The reminder is on by default and you can edit or disable it under Notifications. A booking made less than 24 hours ahead gets no reminder, so nobody receives one after the fact. Custom reminder schedules with several reminders and follow-ups belong to Aponto Premium.

= Does it work with my theme and the block editor? =

Aponto works with any well-built theme. The booking form ships as a native block for the block editor and Full Site Editing, with a live preview while you edit. A shortcode for classic content and page-builder integrations are on the roadmap.

= Can I pre-select a service or place several forms on one site? =

Yes. The block has a service option in its settings sidebar, so each form can pre-select a service and skip the service step. Place as many forms as you like; assets are only loaded on pages that actually render one.

= What about more than one staff member? =

The free plugin supports one staff member with full working hours, date overrides and days off. More staff, each with their own hours and service assignments, belongs to Aponto Premium.

= Can a customer reschedule themselves? =

Not yet. Customers can cancel from the secure link in their email, and you can reschedule any booking from the admin. Customer self-service rescheduling is on the roadmap.

= Can I sync bookings with Google Calendar or Outlook? =

The free plugin gives every customer an "Add to Google Calendar" link and an `.ics` download on the confirmation screen. Syncing your own Google Calendar or Outlook — bookings written to your calendar, and existing events blocking the times Aponto offers — belongs to Aponto Premium.

= How do I export my data, or remove a customer's data? =

Export bookings and customers to CSV from the Bookings and Customers screens. Aponto also integrates with WordPress' built-in personal-data export and erase tools under Tools → Export/Erase Personal Data, and supports time-based anonymization through an optional retention setting.

= Does uninstalling delete my data? =

No, not by default. Your data is kept unless you switch on "Delete all data on uninstall" under Settings → Advanced → Data & uninstall before deleting the plugin.

= Is it translation ready? =

Yes. Everything a customer sees, including the booking form, confirmation, emails and the manage-booking page, is translatable through the `aponto` text domain. A Vietnamese translation is bundled with the plugin, and WordPress language packs from translate.wordpress.org take precedence over the bundled files as soon as a locale is available there. The admin ships RTL stylesheets. Admin-screen translation coverage is still being completed.

= Where do I get help? =

Post on the [WordPress.org support forum](https://wordpress.org/support/plugin/aponto/) or reach the team through [pressmaximum.com/support](https://pressmaximum.com/support/).

== External services ==

Aponto does not contact an external service in the background on a fresh installation. The Google Calendar action below runs only when a customer clicks its link. Stripe communication starts only after you enable that module and enter your own Stripe API keys.

= Google Calendar links =

The confirmation and manage-booking screens can show an "Add to Google Calendar" link. Aponto builds this link locally. Only when a customer clicks it, their browser opens `calendar.google.com` and sends the appointment title (including the service name and, depending on the screen, the business or location name), start and end times, and the configured location address when one is set. The local `.ics` download beside it does not contact Google.

Google terms of service: https://policies.google.com/terms
Google privacy policy: https://policies.google.com/privacy

= Stripe =

The Stripe payments module connects your site to Stripe so customers can pay for a booking with a card. Stripe is a payment processor operated by Stripe, Inc.

The module has a Test mode / Live mode switch and keeps a separate set of keys for each, so you can set everything up with Stripe's test keys, try a real booking, and then switch to Live without pasting anything again. Only the keys of the mode you have selected are ever used.

When it connects, and what is sent:

* Saving your Stripe keys makes no network call at all. The keys are stored on your own site, and the secret key and webhook signing secret are encrypted before they are written to the database.
* Pressing "Test connection" asks Stripe for your account balance (`GET /v1/balance`) to check that the key works. Only the key is sent.
* Pressing "Register webhook with Stripe" asks Stripe to create the notification endpoint for you (`POST /v1/webhook_endpoints`). It sends this site's webhook address, the list of events below, and a description containing your site's domain name; Stripe returns the signing secret, which is stored encrypted on your own site. This is optional — you can add the endpoint by hand in the Stripe Dashboard instead.
* When a customer reaches the Payment step of the booking form, their browser loads Stripe's own payment form from `js.stripe.com`, and your site asks Stripe to create a payment for that booking. Your site sends the amount, the currency, the booking's order code, the booking id, your site's domain name, and a short description of the payment — plus the customer's email address only if you switch on the "Send Stripe receipt" setting. The description is the booked service's name followed by the order code, so the payment is recognisable in your Stripe dashboard; if your service names describe something a customer would consider private, that name is visible in Stripe. It never sends the customer's name, phone number, address, or answers to booking-form questions. Card details are typed directly into Stripe's form and never reach your server.
* Stripe's form in turn contacts Stripe domains including `api.stripe.com`, `m.stripe.com`, `m.stripe.network`, `r.stripe.com`, `b.stripecdn.com` and `merchant-ui-api.stripe.com`, and loads hCaptcha (`hcaptcha.com` and its subdomains) for Stripe's own fraud checks. This happens only on the Payment step, and only when the Stripe module is enabled and set up.
* Stripe sends your site notifications (webhooks) about payments and refunds it processed, including refunds you make from the Stripe dashboard. Your site verifies each notification's signature before acting on it. The plugin's setup screen lists the exact events to subscribe to: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `refund.created`, `refund.updated`, `charge.refunded` and `refund.failed`.
* When you refund a booking from the admin, your site asks Stripe to refund that payment. It sends the payment's Stripe reference, the amount, a reason, and the booking's order code.

Stripe's terms of service: https://stripe.com/legal/ssa
Stripe's privacy policy: https://stripe.com/privacy
hCaptcha's privacy policy: https://www.hcaptcha.com/privacy
hCaptcha's terms of service: https://www.hcaptcha.com/terms

== Changelog ==

= 1.0.3 =

* Restored the bundled Vietnamese translation and script translations in the free plugin. WordPress.org language packs take precedence as soon as they exist.
* Fixed strings falling back to English for the rest of a request after an email was sent on non-English sites.
* Fixed the staff editor staying on "Saving…" after a successful save.
* The customer and service inspectors now stack below 840px and never squeeze the list; a remembered inspector width is clamped to the viewport.
* Assets fall back to the readable JavaScript and CSS files when a minified file is missing.
* The manage-booking page always emits its stylesheet link.
* Demo seeding through `wp aponto seed` now writes business hours.
* Rewritten WordPress.org listing; "Multiple locations" row added to the Free vs Premium comparison on the Modules screen.

= 1.0.2 =

* Clarified the public source and reproducible build path for every distributed browser bundle.
* Made REST API permission callbacks statically explicit while preserving their authorization behavior.
* Updated the Free staff and business-location admin experience.
* Hardened local asset-manifest loading and release validation.

= 1.0.1 =

* Improved WordPress.org compatibility, package separation, and REST permission handling.
* Fixed first-run onboarding navigation while keeping Settings accessible before onboarding is complete.

= 1.0.0 =

* First public release.
* Services and service categories, with unlimited bookings.
* Single-staff scheduling: weekly working hours, date overrides, days off, and per-service assignment.
* Timezone-correct public booking form as a block, for the block editor and Full Site Editing.
* Week and day admin calendar, a filterable bookings list, and customer records.
* Manual bookings and admin reschedule; customer self-service cancellation through a secure link.
* Editable email templates for customers, the site owner and staff, including a customer reminder about 24 hours before a confirmed booking.
* Add-to-calendar links and `.ics` download on the confirmation screen and the manage-booking page.
* Guided onboarding wizard, CSV export of bookings and customers.
* Privacy: personal-data export and erase integration, optional retention-based anonymization, and an optional consent checkbox.

== Upgrade Notice ==

= 1.0.3 =

Translation, admin and listing fixes. No data migration is required.

= 1.0.2 =

WordPress.org compatibility and package-verification update. No data migration is required.

= 1.0.1 =

Compatibility and packaging update. No data migration is required.

= 1.0.0 =

First public release.
