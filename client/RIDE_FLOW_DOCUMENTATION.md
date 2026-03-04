# Ride-Sharing Flow Documentation (Current Implementation)

This document provides an in-depth technical reference for the ride‑sharing client application. The app is designed more like **BlaBlaCar** than a taxi/dispatch service – it targets a niche of office commuters sharing journeys, not on‑demand hailing. Because we cater to scheduled, long‑distance (often daily) rides rather than instant requests, the code prioritises simplicity and relies on passengers and drivers coordinating via the app. This context explains many of the architectural choices below. The document covers passenger and driver interactions, data model, architecture, the full lifecycle of a ride, and the various client‑side mechanisms that handle scheduled bookings.

## 🕒 The "Booking Time Arrived" Logic
Automated status changes (like auto-cancelling "zombie" bookings 12 hours after departure) and proactive notifications (15 minutes before departure) are handled client-side by the `BackgroundManager` component. Other state transitions like "Start Ride" or "Complete Ride" remain manual actions for the driver or passenger.

---

## 🏛️ Architecture & Data Model

Before diving into the flows, it helps to understand the key entities and how they map to Firestore documents.

### Core Collections
* `rides` – stores ride definitions created by drivers. Important fields:
  * `driverId`, `origin`, `destination`, `departureTime` (Timestamp), `status` (`scheduled`, `in_progress`, etc.),
  * `availableSeats`, `totalSeats`, `pricePerSeat`, `routePolyline`, `eta`, `distance`, `vehicleComfort`, `instantBooking`.
* `bookings` – one document per passenger seat reservation. Fields include:
  * `rideId`, `passengerId`, `seatsBooked`, `status` (`confirmed`,`waiting`, `completed`, `cancelled`),
  * `bookingTime`, `activatedAt`, `startedAt`, `completedAt`, `cancelledAt`, `timeBeforeDeparture`, `cancelReason`.
* `users` – contains user profiles with `role` (`driver`/`passenger`), `verificationStatus`, CO2 metrics, etc.

### Client Hooks & Utilities
The application lives in React hooks organized under `src/hooks`. Each hook abstracts API calls, realtime listeners, or utility behavior. Here's a full inventory:

* `useAuth.tsx` – authentication state, user object, login/logout helpers, role & verification data.
* `useLocalStorage.ts` – generic hook to sync a value with `localStorage`.
* `useMobile.tsx` – media-query hook returning a boolean for mobile screen size.
* `useToast.ts` – global toast notification manager; exposes `toast()` method.
* `useConnectionStatus.ts` – monitors network connectivity events.
* `useDriverVerification.ts` – fetches & updates driver verification status.

**Realtime data hooks:**
* `useBookingsRealtime.ts` – passenger’s bookings list with caching & expiry cleanup.
* `useBookingRealtime.ts` – single booking document listener.
* `useRideRealtime.ts` – single ride listener, used by tracking page.
* `useRidesRealtime.ts` – rides list listener with filter options (driver, route, date).
* `useRideBookingsRealtime.ts` – list of confirmed bookings for a given ride.
* `useVehiclesRealtime.ts` – driver’s vehicles list listener.
* `useDriverRidesRealtime.ts` – driver’s posted rides listener (used in MyRides for drivers).
* `useChatRealtime.ts` – listens to chat messages for a chat ID.

**Query/mutation hooks:**
* `useBookings.ts` – fetches static bookings (non-realtime) with ride details.
* `useBooking.ts` – fetch a single booking by ID.
* `useCreateBooking()` / `useCancelBooking()` / `useRideBookings()` – booking management.
* `useRides.ts` – query rides with filters; also provides CRUD hooks: `useRide`, `useCreateRide`, `useUpdateRideStatus`, `useCancelRide`.
* `useRideStatus.ts` – mutation helper for ride lifecycle transitions (arrived, start, complete, cancel, rate).
* `useRideRating.ts` – submit passenger/driver ratings.
* `useVehicles.ts` – vehicle CRUD (`useVehicles`, `useCreateVehicle`, `useUpdateVehicle`, `useDeleteVehicle`).
* `useMessages.ts` – paginated message retrieval for chat.
* `useTypingStatus.ts` – send/receive typing indicator for chats.
* `useSupportTickets.ts` – create support ticket and list.

This architecture keeps business logic decoupled from UI, and most components simply call hooks.

### Page Components
The `src/pages` folder contains route targets; each page composes components and hooks.

* `Home.tsx` – landing/dashboard showing available rides and open bookings.
* `Search.tsx` – ride search form with filters; uses `useRidesRealtime`.
* `RideDetails.tsx` – detailed view for a single ride, booking form, and passenger/driver info.
* `CreateRide.tsx` – form for drivers to publish a ride (includes route autocomplete, price, vehicle selection).
* `MyRides.tsx` – dual-mode page showing either driver’s rides or passenger’s bookings based on user role.
* `RideWaiting.tsx` – waiting/arrival screen displayed just before ride starts.
* `RideTracking.tsx` – shows active ride map and completion button.
* `RideCompletion.tsx` – post-trip summary and CO₂ metrics.
* `RideRating.tsx` – passenger/driver rating submission.
* `Chat.tsx`, `Inbox.tsx` – chat interfaces using `useChatRealtime`, `useMessages`, `useTypingStatus`.
* `CreateRide_old.tsx` – legacy ride creation page preserved for reference.
* `HelpSupport.tsx`, `FAQ.tsx` – static support content and form.
* `Settings.tsx` – account settings including addresses and verification documents.
* `Profile.tsx` – edit user profile and view statistics.
* `Login.tsx`, `Register.tsx`, `VerificationRequired.tsx` – authentication flows.
* `Welcome.tsx` – initial onboarding screen.
* `PrivacyPolicy.tsx`, `TermsOfService.tsx` – legal documents.
* `not-found.tsx` – 404 fallback.

Each page imports only the hooks and UI components it needs; navigation is handled via `wouter`.

---

## 🔁 End-to-End Application Workflow

To provide A–Z context, the following section narrates the full user journey from opening the app to completing a ride, including background processes and UI tooltips.

1. **Launch & Authentication**
   * **Welcome/Login:** On app start `App.tsx` bootstraps `useAuth`. If no user, `Welcome.tsx` or `Login.tsx` is shown. `useAuth` persists the token and exposes `user` object.
   * Once logged in, `Home.tsx` is rendered with `useRidesRealtime` to show nearby rides. A tooltip at the top explains: "Search for rides by origin/destination or create your own if you're a driver." (component: `Tooltip` from UI library.)

2. **Searching & Booking (Passenger)**
   * Go to `Search.tsx` – users input pickup/drop locations, date/time. `LocationInput` components show autocomplete suggestions from Google Maps.
   * The `SearchFilters` component includes a price slider, seat count, and instant booking toggle.
   * Results display via `RideCard` list; each card shows ride details and a "Book" button.
   * Tooltip on `Book` button: "Click to reserve seats; booking closes 15 minutes before departure."
   * Clicking triggers `useCreateBooking` mutation; optimistic UI shows a loading spinner, then toast "Ride Booked!".

3. **Ride Details**
   * After booking, passenger can access `MyRides.tsx` or click the ride to see `RideDetails.tsx`.
   * The page lists driver info, vehicle, pickup time, price, and passenger list (if driver views it).
   * Driver can cancel the ride if it's still scheduled (calls `useCancelRide`).

4. **Pre-ride (Waiting)**
   * Before departure, passenger/driver landing at `/ride/:bookingId/waiting`. Hooks `useBookingRealtime` and `useRideStatus` provide state.
   * Driver uses "I've Arrived" → `markArrived()` sets status to `waiting`; passenger sees blue badge.
   * Passenger sees the map, driver ETA, and can chat via `Chat.tsx` opened with `useChatRealtime`.
   * If driver doesn’t start after departure +5m, passenger sees override button.

5. **Active Ride (Tracking)**
   * `/ride/:bookingId/tracking` shows `RideTracking.tsx`. It fetches full `ride` doc for polyline and uses GoogleMaps API.
   * Route is drawn using the `Polyline` component; ETA and distance update based on ride state.
   * Driver taps "Arrived at Destination" to finish. This triggers CO₂ batch update.
   * Passenger is auto-redirected to `/ride/:bookingId/complete`.

6. **Completion & Rating**
   * `RideCompletion.tsx` shows summary: distance, CO₂ saved, cost. A tooltip: "Feel free to rate your experience below."
   * After submission, `RideRating.tsx` allows star rating; `useRideRating` mutation submits ratings and transitions booking to `rated`.

7. **Ancillary Features**
   * **Chat:** `Inbox.tsx` lists conversation threads; `Chat.tsx` shows messages and typing status, powered by `useChatRealtime` and `useTypingStatus`.
   * **Support:** `HelpSupport.tsx` renders a form using `useSupportTickets`.
   * **Settings/Profile:** Users manage personal info, vehicles (`useVehicles` hooks), and verification docs.
   * **Notifications:** Toasts generated via `useToast` give real-time feedback across the app.

8. **Background Behaviors**
   * Every real-time hook persists data to localStorage and avoids redundant state updates using JSON string checks.
   * `BackgroundManager` periodically auto-cancels stale bookings 12h past departure to prevent orphaned data.
   * `useConnectionStatus` displays offline banners and queues mutations until reconnect.

---

This A–Z report should give any developer the full context: from the tiniest tooltip guidance through to the central booking and ride-engine, along with hook internals and page responsibilities. All code paths are now visible in the documentation, making onboarding and future feature work straightforward.

Feel free to ask for architectural diagrams, tests, or example logs next! Let me know if you'd like a PDF export or a markdown split by section. 
### Data Normalization
All timestamps are converted to `Date` objects on read. The hooks also hydrate nested `ride` objects inside bookings for convenience.

---

## 🧑‍🤝‍🧑 Passenger Flow

### 1. Booking State (`confirmed`)
*   **Listener:** `useBookingsRealtime.ts` opens a Firestore query `where("passengerId","==",user.uid)` and caches responses to `localStorage`. New bookings trigger `setBookings` only if the JSON string changes.
*   **UI:** `MyRides.tsx` renders each booking with `RideCard` and ensures the status badge matches `booking.status`. Bookings are sorted by `bookingTime` using a memoized sort.
*   **Implementation detail:** the hook converts nested `ride` fields and uses `ride.departureTime.toDate()` when generating `timeBeforeDeparture`.
*   **User action:** passenger taps a booking, which navigates to `/ride/{rideId}`; direct navigation to `/ride/{bookingId}/waiting` is also supported.
*   **Edge cases:** if `user` is null or listener errors, the hook sets `bookings` to `[]` and surfaces `error`.

### 2. Waiting for Driver (`waiting`)
*   **Trigger:** when the driver invokes `markArrived()` (see `useRideStatus`), the booking document is updated:
  ```ts
  updateBookingStatus("waiting", { activatedAt: Timestamp.now() });
  ```
*   **UI:** `RideWaiting.tsx` renders based on `booking.status`. A `useEffect` watches `booking?.status` and redirects to `/tracking` when it becomes `in_progress`.
*   **Side effect:** a client-side `setInterval` simulates a wait timer, but this has no backend effect.
*   **Passenger override:** after 5 minutes past scheduled departure, the new "Passenger Override" button appears (see code snippet above) and calls `startRide()`.

### 3. During Ride (`in_progress`)
*   **Map:** `RideTracking.tsx` fetches the ride document separately (because bookings may not include full route data). It decodes `routePolyline` via `decodePolyline` utility.
*   **UI Update:** passenger sees ETA and route. A `useEffect` listens for `booking.status === "completed"` and navigates to `/complete` with a 500ms delay to allow asynchronous CO2 calculations.

### 4. Completion (`completed` → `rated`)
*   **Passenger action:** on the completion page (`RideCompletion.tsx`), the passenger can submit a rating which updates `booking.passengerRating`/`driverRating` and transitions status to `rated`.

---

## 🚗 Driver Flow
### 2. Waiting for Driver (`waiting`)
*   **Trigger:** This state is entered when the **Driver** taps "I've Arrived".
*   **UI:** `RideWaiting.tsx` displays a "Driver Arriving" screen with a real-time count-up timer.
*   **Navigation:** When the `status` in Firestore changes to `in_progress`, the passenger is automatically redirected to `/tracking` via a `useEffect` hook.

### 3. During Ride (`in_progress`)
*   **UI:** `RideTracking.tsx` shows the route on a Google Map using `routePolyline`.
*   **Completion:** When the `status` changes to `completed`, the passenger is automatically redirected to the Ride Completion screen after a 500ms delay.

---

## 🚗 Driver Flow

### 1. Managing Scheduled Rides
*   **UI:** Drivers see their posted rides in `MyRides.tsx`. If a ride is `scheduled`, they see a "Cancel Ride" option.
*   **Start Process:** The driver must manually open the booking to initiate the arrival/start sequence.

### 2. Arrival & Starting (`confirmed` → `waiting` → `in_progress`)
#### Driver UI
The driver arrives at the pickup page (same `RideWaiting.tsx` component as passengers). Their view includes:
* **"I've Arrived" button:** when clicked it executes:
  ```ts
  updateBookingStatus("waiting", { activatedAt: Timestamp.now() });
  ```
  which leaves a `waiting` status visible to the passenger.
* **"Start Ride" button:** enabled once the driver confirms passenger onboard. This commits:
  ```ts
  updateBookingStatus("in_progress", { startedAt: Timestamp.now() });
  ```
* Both buttons set `isUpdating` to show a loading spinner.

#### Data Consistency
Since `useRideStatus` uses `updateDoc`, the update is applied only to the booking document. There is no duplicated ride document write; the ride's status is only updated when creating/cancelling a ride.

#### Failure Modes
If the driver's phone loses connectivity while tapping, Firestore retries automatically. The passenger override (described earlier) handles the scenario where the driver never starts.

### 3. Ride Completion (`in_progress` → `completed`)
*   **Button:** "Arrived at Destination" in `RideTracking.tsx` triggers a complex `markCompletedWithCO2` function.
*   **Batch Update:** writes booking status, `completedAt`, `co2SavedKg` and updates both users' CO2 counters using a Firestore `writeBatch`.
*   **Logging:** multiple `console.log` statements exist in this function to facilitate debugging of CO₂ computations (see lines 30–80 of `use-ride-status.ts`).

---

## 🧩 Implementation Notes & Code References

### useRideStatus.ts
This hook encapsulates every mutation that a driver or passenger can perform on a booking. Important details:
* Local React state mirrors Firestore fields, allowing components to optimistically display new status.
* All mutations call `updateDoc` on the booking reference; error handling sets a local `error` string.
* `markCompletedWithCO2` demonstrates how to perform reading, computing, and a batched write within a try/catch to avoid partial updates.

### Real-Time Hooks
Each `use*-realtime` hook employs `onSnapshot` and caches the last stringified response to avoid unnecessary state updates (compare JSON strings). They also save to `localStorage` for instant first-render UX.

### Validation Logic
* Stored chiefly in `useCreateBooking` and `useCreateRide` – both contain extensive client‑side guard clauses with immediate Toast feedback.
* Verification checks added directly before performing mutations; if the user is not verified they are redirected to `/verification-required`.

---

## 🐞 Bug Fix Summary (With Code Snippets)

Each fix is documented with a before/after description and a link to the modified file. Search the repository for the comment markers (e.g. `// 🚫 PREVENT DRIVERS`) to locate relevant blocks quickly.

### 1. Transactional Booking
```ts
// replaced getDoc/addDoc/updateDoc sequence with runTransaction in use-bookings.ts
const newBookingId = await runTransaction(db, async (transaction) => { ... });
```

### 2. Batch Cancellation
```ts
const batch = writeBatch(db);
bookingsSnapshot.docs.forEach(doc => batch.update(doc.ref, { status: 'cancelled' }));
batch.update(rideRef, { status: 'cancelled' });
await batch.commit();
```

### 3. Passenger Override Button
Check `RideWaiting.tsx` around the `canPassengerStart` constant and JSX block showing the amber button with `ShieldCheck` icon.

### 4. Expiry Cleanup
Zombie booking cleanup is implemented in `BackgroundManager.tsx` as part of the Global Automation Heartbeat. It runs every minute and cancels confirmed bookings where `departureTime + 12h` is in the past, using a batch write with `cancelReason: "Auto-cleanup: 12h past departure"`.

### 5. Booking Deadline Increase
Updated the minutes threshold to 15 in validation block of `useCreateBooking`.

### 6. Verification Guards
Inserted early returns in `CreateRide.tsx` and `RideDetails.tsx` to check `user.verificationStatus` before proceeding with sensitive actions.

---

## 🧪 Testing & Validation

To ensure these changes work correctly:
1. **Concurrency test:** open two browsers, attempt to book the final seat concurrently; verify only one succeeds.
2. **Cancellation atomicity:** create a ride with multiple bookings, cancel as driver, then check all bookings are marked cancelled in Firestore.
3. **Passenger override:** set a ride departure time in the past, navigate as passenger and ensure the override button appears and starts the ride.
4. **Expiry cleanup:** navigate to the app as an authenticated passenger with a confirmed booking whose departure time was >12 hours ago; within one minute the `BackgroundManager` heartbeat should auto-cancel it (check `cancelReason: "Auto-cleanup: 12h past departure"` in Firestore).
5. **Deadline enforcement:** try booking a ride within 10 minutes of departure; the mutation should throw an error and the UI should disable the book button.
6. **Verification checks:** log in as an unverified user; ensure you cannot create or book rides and are redirected appropriately.

Use the Firestore emulator or a staging environment for destructive tests.

---

## 🔮 Future Enhancements

* Integrate Cloud Functions or a scheduled job for true backend expiry and notification.
* Add push notifications when rides transition between statuses.
* Implement driver GPS tracking and estimated arrival calculations using real-time location streaming.
* Refactor common validation logic into reusable hooks or utilities.

This document should now serve as a comprehensive technical manual for any new developer joining the project. Let me know if you want to extract code snippets into separate markdown files or add diagrams.
### 3. Completing the Ride (`in_progress` → `completed`)
*   **Manual Action:** In `RideTracking.tsx`, the driver taps **"Arrived at Destination"**.
    *   *Action:* Calls `markCompletedWithCO2()`.
    *   *Database:* Updates `status` to `completed`, sets `completedAt`, and increments CO₂ savings for both users using a Firestore `writeBatch`.

---

## 🛠 Technical Implementation Details

### State Management: `useRideStatus.ts`
This is the core hook managing status transitions. It directly interacts with Firestore:
- `markArrived()`: Status → `waiting`
- `startRide()`: Status → `in_progress`
- `markCompletedWithCO2()`: Status → `completed` + Analytics update.
- `cancelRide()`: Status → `cancelled`.

### Real-time Sync: `useBookingRealtime.ts`
Ensures that both parties see state changes (like status flips or cancellations) immediately without refreshing.

---

## ✅ Core Features and Updated Behaviours

The following sections describe each major capability of the ride flow as implemented in the current client. These are not bugs but features that were designed or refined during development. Wherever relevant, note the hook or component that realizes the behaviour and link to code snippets for clarity.

### Atomic Booking Transaction
*   **Purpose:** Prevent overbooking and keep ride seat counts accurate under concurrent access.
*   **Location:** `useCreateBooking` in `src/hooks/use-bookings.ts`.
*   **Mechanism:** Executes a Firestore `runTransaction` reading the ride document, verifying seats, writing the booking, and decrementing `availableSeats` in a single atomic operation. Errors are thrown if validation fails (driver booking own ride, duplicate booking, ride status, time threshold, or insufficient seats).

### Reliable Ride Cancellation
*   **Purpose:** Ensure cancelling a ride updates all linked bookings consistently.
*   **Location:** `useCancelRide` in `src/hooks/use-rides.ts`.
*   **Mechanism:** Queries confirmed bookings, collects updates in a single `writeBatch`, then commits. The driver-facing UI (`MyRides.tsx`) shows a confirmation dialog before invoking this hook.

### Passenger Override Start
*   **Purpose:** Allow passengers to start rides if the driver becomes unreachable.
*   **Location:** `RideWaiting.tsx`.
*   **Mechanism:** Computes `canPassengerStart` using a `useMemo` comparing current time to departure time plus five minutes. If true, renders an amber override button that calls `startRide()` from `useRideStatus`.

### Client-Side Expiry Cleanup
*   **Purpose:** Automatically clean up stale bookings older than a fixed threshold when users are active in the app.
*   **Location:** `src/components/BackgroundManager.tsx` (Global Automation Heartbeat).
*   **Mechanism:** A `setInterval` runs every minute and iterates over confirmed bookings. If `departureTime + 12h` is in the past, a batch write cancels the booking with `cancelReason: "Auto-cleanup: 12h past departure"`.

### Booking Deadline Enforcement
*   **Purpose:** Prevent passengers from booking too close to departure, giving drivers planning time.
*   **Location:** `useCreateBooking` validation block.
*   **Mechanism:** Computes `minutesUntilRide` and rejects the mutation if under 15 minutes; UI disabling is handled in `RideDetails.tsx` (see earlier descriptions).

### Verification Requirement Checks
*   **Purpose:** Block unverified users from posting or booking rides.
*   **Location:** Early guards in `CreateRide.tsx` and `RideDetails.tsx`.
*   **Mechanism:** Check `user.verificationStatus !== 'verified'` before performing mutation, show toast and redirect to `/verification-required` when necessary.

---

## 🔗 Hook & Component Breakdown

Below is a detailed description of every custom hook and key component in the ride flow, including their responsibilities, input parameters, and side effects.

### `useAuth`
*Provides authenticated user object.*
- Returns `{ user, isLoading, login, logout }`.
- Used by nearly every other hook for authorization checks.

### `useBookingsRealtime` & `useBookingRealtime`
*Real-time Firestore listeners for multiple or single booking.*
- Accepts optional booking ID for single-document listener (`useBookingRealtime`).
- Converts Firestore `Timestamp` to `Date` and handles caching.
- Exposes `{ bookings, loading, error }`.
- Side effects include localStorage caching and expiry cleanup (described earlier).

### `useRideStatus`
*Encapsulates all ride state mutations.*
- Input: `bookingId`, `initialStatus` (default `"confirmed"`).
- Returns state (`status`, `activatedAt`, etc.), `isUpdating`, `error`, and action methods: `markArrived`, `startRide`, `markCompleted`, `markCompletedWithCO2`, `confirmCompletion`, `markRated`, `cancelRide`.
- Handles Firestore updates and optional CO₂ analytics.

### `useRidesRealtime`
*Realtime listener for rides, with optional filters.*
- Filters include `driverId`, `origin`, `destination`, date/time, pagination.
- Used in `Home.tsx` and `MyRides.tsx`.

### `useBookings` / `useRideBookings`
*Query-only hooks for fetching static lists.*
- Used by admin views and the ride details page to load passenger lists.
- Not reactive; re-fetched via React Query when component mounts or mutation invalidates cache.

---

## Component Responsibilities

### `MyRides.tsx`
*Displays either driver’s posted rides or passenger's bookings.*
- Contains sorting, cancellation dialogs, and delegated `RideCard` components.

### `RideCard.tsx`
*Reusable card representing a ride.*
- Accepts props like `showStatus`, `userBooking`, `isDriverRide`, and optional cancel callback.
- Computes pickup time and distance if passenger coordinates are provided.

### `RideWaiting.tsx` and `RideTracking.tsx`
*Screens shown during the ride lifecycle.*
- Both fetch booking via `useBookingRealtime` and use the `useRideStatus` hook.
- `RideWaiting` handles both driver and passenger views; `RideTracking` shows map and completion button.

### `RideCompletion.tsx` and `RideRating.tsx`
*Final screens after a ride completes.*
- Allow rating submission and show CO₂ savings summary.

### Other utilities/components
- `LocationInput`, `SearchFilters`, etc. unrelated to core flow but referenced in tests and search pages.

---

## 🏗️ Architectural Decisions & Known Limitations

The following items are not "bugs" but intentional design choices to keep the application **free, serverless, and niche-focused** (office commuters). As the app lacks Cloud Functions, automated behaviors are implemented via client-side logic and the `BackgroundManager`.

1.  **No Automatic Dispatch:** Unlike Uber/Lyft, there is no "Search for Driver" automation. Bookings are confirmed immediately upon passenger request if seats are available, fitting the **BlaBlaCar** model.
2.  **Limited Proactive Notifications (No OS Push):** The app does not use OS-level push notifications. Time-based reminders and status nudges are handled client-side (via in-app UI and the `BackgroundManager`) and only work while the app is running.
3.  **Manual Start/Arrival:** A ride will stay in `confirmed` status indefinitely unless the driver manually marks arrival or the passenger uses the **Override** feature.
4.  **Partial Offline Support:** While `useConnectionStatus` shows banners, there is no robust queue for critical updates like `markCompletedWithCO2`. Connectivity is required for state transitions.
5.  **Text-Based Search:** Search relies on exact string matches for origin/destination, which suits fixed office routes better than variable pickup points.
6.  **Minimal Error Surfaces:** Most errors are logged to the console via [use-ride-status.ts](client/src/hooks/use-ride-status.ts).
7.  **Client-Side Driver Verification:** Verification status is checked in [RideDetails.tsx](client/src/pages/RideDetails.tsx) and [CreateRide.tsx](client/src/pages/CreateRide.tsx). Since these are client-side guards, they rely on Firestore Security Rules for true backend enforcement.
8.  **Static Legal Pages:** `PrivacyPolicy.tsx` and `TermsOfService.tsx` are hard-coded React components, requiring a redeploy for any legal updates.

These limitations are inherited from the MVP design and provide a clear roadmap for future backend integration.

---

## 🛠 Feature Verification Summary

Each complex flow in the codebase has been audited and verified for reliability using the following frontend-only techniques:

### 1. Atomic Booking (Transaction-Safe)
*   **Implementation:** [use-bookings.ts](client/src/hooks/use-bookings.ts#L80)
*   **Logic:** Uses `runTransaction` to read current `availableSeats`, verify the 15-minute deadline, and decrement seats only if capacity exists. This prevents race conditions during concurrent bookings.

### 2. Multi-Document Cancellation (Batched)
*   **Implementation:** [use-rides.ts](client/src/hooks/use-rides.ts#L215)
*   **Logic:** Uses `writeBatch` to simultaneously cancel a `ride` and all associated `bookings` in one atomic network request, preventing partial state failures.

### 3. Passenger Override (Safety Valve)
*   **Implementation:** [RideWaiting.tsx](client/src/pages/RideWaiting.tsx#L33)
*   **Logic:** If a driver hasn't started the ride 5 minutes after the scheduled `departureTime`, passengers are granted a "Start Ride Now" button to transition the state and access maps.

### 4. Zombie Cleanup (Client-Side Cron)
*   **Implementation:** [BackgroundManager.tsx](client/src/components/BackgroundManager.tsx)
*   **Logic:** A `setInterval` in `BackgroundManager` runs every minute. If any confirmed booking has `departureTime + 12h` in the past, the client triggers a batch write to cancel them with `cancelReason: "Auto-cleanup: 12h past departure"`, keeping the database clean.

---

## 🧪 Testing & Validation
