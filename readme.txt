=== Aponto ===
Contributors: pressmaximum
Tags: appointments, booking, calendar, scheduling, booking-form
Requires at least: 6.6
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 1.0.1
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Appointment booking for WordPress: services, staff schedules, timezone-correct slots, email confirmations, and a mobile booking form.

== Description ==

Aponto is an appointment booking plugin for solo salons, clinics, coaches, and small studios. Add your services, set your working hours, drop the booking form block on any page, and let customers book on mobile — in their own timezone, with automatic email confirmations for both sides.

Every time a customer sees is rendered through a single timezone-safe formatter, so the slot picker, summary, confirmation, manage page, and email all agree. The setup wizard gets a non-technical owner to their first bookable service in a few minutes without reading documentation.

= Source code and build tools =

The complete human-readable JavaScript and CSS source for this release is included in the plugin under `assets/src/`. The build configuration, locked dependency graph, and build script are included alongside it.

Public Free release mirror: https://github.com/PressMaximum/aponto-free

See `README.md` for the source-to-bundle map, direct dependency source links, requirements, and exact rebuild commands. The public repository is generated from the validated Free distribution ZIP after an approved release; development changes are made in the main Aponto repository rather than directly in the mirror.

= What you get in the free plugin =

* Unlimited bookings and unlimited services, grouped into categories.
* A mobile-first booking form as a block (`aponto/booking-form`) for the block editor and Full Site Editing.
* Timezone-correct slots — remote customers book in their own timezone, you manage in the business timezone, and both are shown clearly.
* One staff member with weekly working hours, date overrides, days off, and per-service assignment.
* An optional business location (a fresh install starts with none — you only add one if your bookings need an address).
* Eight editable email templates: booking received, confirmed, rescheduled, cancelled, and completed for the customer, plus new-booking and cancellation notices for you. Seven are on out of the box; you can switch any of them on or off.
* An appointment reminder email sent to the customer about 24 hours before a confirmed booking.
* Add to calendar — a Google Calendar link and an `.ics` download on the confirmation screen and on the customer's manage page.
* Admin dashboard with a filterable bookings list, a week and day calendar, customers, and services.
* Manual bookings and admin reschedule from the dashboard.
* Customer self-service cancellation through a secure link in their email.
* A guided onboarding wizard that pre-fills from your site settings.
* CSV export of bookings and customers (Excel-compatible, protected against spreadsheet formula injection).
* Mark bookings paid or unpaid.
* Privacy built in: WordPress personal-data export and erase integration, optional time-based anonymization (retention), and an optional consent checkbox on the form.
* Translation-ready — everything a customer sees is translatable through the `aponto` text domain; admin-screen translation coverage is being completed. The wp.org edition uses WordPress language packs, admin screens ship RTL stylesheets, and the plugin includes its human-readable sources so the bundles can be rebuilt.

= Free vs Premium =

Aponto Free supports a single-staff business with unlimited bookings and services. Business identity and location details are configured under General → Business.

Card payments with Stripe are already part of this free plugin. More modules are on the roadmap and will be released across future updates — some in this free plugin (CSV import, a public service catalog), others as premium modules. Premium already includes unlimited staff, advanced reminder schedules, custom booking-form fields, Google Calendar and Outlook sync, and PayPal payments, with SMS and more to follow. Every module is listed inside the plugin on the Modules screen as a preview — nothing there is required, and no purchase is asked of you to run the free plugin.

== Installation ==

1. Upload the `aponto` folder to `/wp-content/plugins/`, or install the plugin ZIP from Plugins → Add New → Upload Plugin.
1. Activate Aponto through the Plugins screen.
1. Open Aponto in the admin menu and follow the setup wizard: confirm your business info, set working hours, and create your first service.
1. Add the "Aponto Booking Form" block to any page, or let the wizard create a booking page for you.

== Frequently Asked Questions ==

= How do customers book? =

Add the Aponto Booking Form block to a page. Customers pick a service, choose a date and time, enter their details, and confirm. Both the customer and the site admin get an email.

= Does it handle timezones correctly? =

Yes. When a customer's browser timezone differs from the business timezone, the form shows a timezone selector and books in the customer's timezone, while the admin always sees the business timezone. Every surface a customer sees — slot picker, summary, confirmation, manage page, and email — uses the same timezone, so nothing disagrees.

= Do customers get a reminder before their appointment? =

Yes. Aponto emails the customer about 24 hours before a confirmed booking. The reminder is on by default and you can edit or disable it under Notifications. Bookings made less than a day in advance do not get one, since the reminder time has already passed.

= Can I pre-select a service or place several forms on one site? =

Yes. The block has a service option in its settings sidebar, so each form can pre-select a service and skip the service step. Assets are only loaded on pages that actually render a form.

= Does it work with the block editor? =

Yes. It ships as a dynamic block for the block editor and Full Site Editing, with a live preview while you edit. A shortcode for classic content and page-builder integrations are on the roadmap.

= Can customers pay online? =

Yes. Card payments through your own Stripe account are included in the free plugin: turn on the Stripe module, paste your Stripe keys, and customers pay on the booking form itself without leaving your site. You choose whether payment is optional or required, and you can still mark bookings as paid or unpaid by hand. PayPal is a premium module and is not part of this free plugin; deposits and coupons are on the premium roadmap.

= What about more than one staff member? =

The free plugin supports one staff member. Unlimited staff, with per-staff working hours and service assignments, is available in Aponto Premium.

= Can a customer reschedule themselves? =

Not in the free plugin. Customers can cancel from the secure link in their email, and you can reschedule any booking from the admin. Customer self-service rescheduling is on the premium roadmap.

= How do I export my data, or remove a customer's data? =

Export bookings and customers to CSV from the Bookings and Customers screens. Aponto also integrates with WordPress' built-in personal-data export and erase tools (Tools → Export/Erase Personal Data), and supports time-based anonymization through an optional retention setting.

= Does uninstalling delete my data? =

No, not by default. Your data is kept unless you opt in under Settings → Advanced ("Remove all data on uninstall") before deleting the plugin.

= Is it translation ready? =

Yes. Everything a customer sees — the booking form, confirmation, emails, and the manage-booking page — is translatable through the `aponto` text domain. The wp.org edition uses WordPress language packs from translate.wordpress.org. Admin-screen translation coverage is still being completed, and the plugin ships RTL stylesheets for the admin screens.

= How do I rebuild the JavaScript from source? =

See `README.md` and the Build instructions below — the plugin ships its human-readable sources so the bundled JavaScript can be rebuilt.

== Build instructions ==

The JavaScript and CSS in `assets/dist/` are compiled from the human-readable sources in `assets/src/`. Those sources ship with the plugin, together with `package.json`, `package-lock.json`, `webpack.config.js`, and `scripts/build-assets.mjs`, so you can rebuild the bundles yourself and compare them with what is shipped.

Requirements: Node.js 20 or newer and npm 10 or newer.

From the plugin directory, run:

~~~
npm ci && npm run build:free
~~~

`npm ci` installs the exact dependency versions pinned in `package-lock.json`. `npm run build:free` rebuilds two files for every JavaScript and CSS entry in `assets/dist/free/`: a readable debug file such as `admin.js` or `admin.css`, and a minified production file such as `admin.min.js` or `admin.min.css`. Lazy-loaded JavaScript chunks and RTL stylesheets are emitted in the same paired form.

At runtime Aponto loads the readable files when `WP_DEBUG` or `SCRIPT_DEBUG` is `true`; otherwise it loads the `.min.js` and `.min.css` files. These readable bundles are provided for convenient browser debugging. The original, non-compiled source of truth remains `assets/src/`.

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
* Pressing "Register webhook with Stripe" asks Stripe to create the notification endpoint for you (`POST /v1/webhook_endpoints`). It sends this site's webhook address, the list of events above, and a description containing your site's domain name; Stripe returns the signing secret, which is stored encrypted on your own site. This is optional — you can add the endpoint by hand in the Stripe Dashboard instead.
* When a customer reaches the Payment step of the booking form, their browser loads Stripe's own payment form from `js.stripe.com`, and your site asks Stripe to create a payment for that booking. Your site sends the amount, the currency, the booking's order code, the booking id, your site's domain name, and a short description of the payment — plus the customer's email address only if you switch on the "Send Stripe receipt" setting. The description is the booked service's name followed by the order code, so the payment is recognisable in your Stripe dashboard; if your service names describe something a customer would consider private, that name is visible in Stripe. It never sends the customer's name, phone number, address, or answers to booking-form questions. Card details are typed directly into Stripe's form and never reach your server.
* Stripe's form in turn contacts Stripe domains including `api.stripe.com`, `m.stripe.com`, `m.stripe.network`, `r.stripe.com`, `b.stripecdn.com` and `merchant-ui-api.stripe.com`, and loads hCaptcha (`hcaptcha.com` and its subdomains) for Stripe's own fraud checks. This happens only on the Payment step, and only when the Stripe module is enabled and set up.
* Stripe sends your site notifications (webhooks) about payments and refunds it processed, including refunds you make from the Stripe dashboard. Your site verifies each notification's signature before acting on it. The plugin's setup screen lists the exact events to subscribe to: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `refund.created`, `refund.updated`, `charge.refunded` and `refund.failed`.
* When you refund a booking from the admin, your site asks Stripe to refund that payment. It sends the payment's Stripe reference, the amount, a reason, and the booking's order code.

Stripe's terms of service: https://stripe.com/legal/ssa
Stripe's privacy policy: https://stripe.com/privacy
hCaptcha's privacy policy: https://www.hcaptcha.com/privacy
hCaptcha's terms of service: https://www.hcaptcha.com/terms

== Changelog ==

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
* Eight editable email templates, including a customer reminder about 24 hours before a confirmed booking.
* Add-to-calendar links and `.ics` download on the confirmation screen and the manage-booking page.
* Guided onboarding wizard, CSV export of bookings and customers.
* Privacy: personal-data export and erase integration, optional retention-based anonymization, and an optional consent checkbox.

== Upgrade Notice ==

= 1.0.1 =

Compatibility and packaging update. No data migration is required.

= 1.0.0 =

First public release.
