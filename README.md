# loupeV2 — JavaScript Runtime & Event Loop Visualizer

A modern, minimalist visualizer to help developers and learners understand how JavaScript's **Call Stack**, **Web APIs**, **Callback Queue**, and **Event Loop** interact under the hood.

---

## 🌟 Attribution & Origin

> **Note**: This project is a modernized fork of Philip Roberts' legendary [Loupe](https://github.com/latentflip/loupe) tool, created for his classic JSConf EU 2014 talk:  
> 📺 [**"What the heck is the event loop anyway?"**](https://www.youtube.com/watch?v=8aGhZQkoFbQ)
>
> If you want to see the original 2014 version, you can view it here:  
> 🔗 [**Original Loupe by Philip Roberts**](https://latentflip.com/loupe/?code=JC5vbignYnV0dG9uJywgJ2NsaWNrJywgZnVuY3Rpb24gb25DbGljaygpIHsKICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gdGltZXIoKSB7CiAgICAgICAgY29uc29sZS5sb2coJ1lvdSBjbGlja2VkIHRoZSBidXR0b24hJyk7ICAgIAogICAgfSwgMjAwMCk7Cn0pOwoKY29uc29sZS5sb2coIkhpISIpOwoKc2V0VGltZW91dChmdW5jdGlvbiB0aW1lb3V0KCkgewogICAgY29uc29sZS5sb2coIkNsaWNrIHRoZSBidXR0b24hIik7Cn0sIDUwMDApOwoKY29uc29sZS5sb2coIldlbGNvbWUgdG8gbG91cGUuIik7!!!PGJ1dHRvbj5DbGljayBtZSE8L2J1dHRvbj4%3D)

---

## 🚀 What's New in loupeV2

### 1. Reliable Code Editing & Execution (No More Code Reverting)
* **The original bug**: In the 2014 version, code changes were only pushed on editor `blur`. Clicking "Save + Run" triggered an Ampersand router navigation that called `decodeUriSource()`, which wiped out custom edits and reverted back to the default code snippet (or crashed on `?code=!!!`).
* **loupeV2 fix**: Direct reactive state management. Writing code, hitting **"Save + Run"**, or pressing <kbd>⌘ + Enter</kbd> (<kbd>Ctrl + Enter</kbd>) instantly compiles and executes **your code**. State is safely serialized to the URL with Unicode/UTF-8 base64 encoding without reloading or resetting.

### 2. Modern ES6+ AST Step Interpreter
* Replaced the obsolete `falafel` + `esprima 1.2` (which threw fatal syntax errors on `let`, `const`, and arrow functions) with an async step interpreter powered by `Acorn`.
* Replaced synchronous CPU busy-wait loops in Web Workers with cooperative asynchronous scheduling, giving full control over execution speed, pause, resume, and single-stepping without locking up the browser.

### 3. Plain-English "Live Narrator" Banner
* A prominent caption banner at the top of the visualizer narrates every single JavaScript event in plain English as it happens:
  * *"Line 10: Called setTimeout(timeout, 5000). Offloaded timer to Web APIs (5.0s countdown)."*
  * *"Call Stack is busy with main(). The expired timer's callback must wait in the Callback Queue."*
  * *"Call Stack is now empty! The Event Loop shifts 'timeout()' into the Call Stack."*

### 4. Time-Travel Scrubber (Step Forward & Step Back)
* Captures execution snapshots at each step (`Step X of Y`).
* Use the **◀ Back** and **Next ▶** buttons to pause and step backward or forward through time at your own reading speed.

### 5. Chronological "Event History Log"
* A persistent step-by-step audit log tracking the entire lifecycle of function calls, timer creations, DOM events, and queue shifts with filter tabs (`All`, `Call Stack`, `Web APIs`, `Event Loop`, `Console`).

### 6. The Event Loop "Gatekeeper" Checklist
* Clearly displays the two fundamental rules the Event Loop evaluates:
  1. `Is Call Stack Empty?` ➔ `[ YES ✓ ]` or `[ NO ✋ (Busy) ]`
  2. `Is Callback Queue Ready?` ➔ `[ YES ✓ (N items) ]` or `[ 0 items ]`
  * Visually demonstrates *why* callbacks cannot run while synchronous code occupies the Call Stack.

### 7. Color-Coded Lifecycles & Ghost Exit States
* Every asynchronous task receives a shared color token that follows it from Web APIs ➔ Callback Queue ➔ Call Stack.
* Completed frames and expired timers transition with a `✓ Completed` ghost state before dissolving, giving the human eye time to register what just happened.

### 8. Modern Tooling with `pnpm` & Vite
* Clean, lightning-fast development server and production bundler using **Vite**, **React 19**, and **pnpm** with zero deprecated dependencies.

---

## 🛠️ Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* [pnpm](https://pnpm.io/) (`corepack enable` or `npm install -g pnpm`)

### Installation & Run

```bash
# 1. Install dependencies
pnpm install

# 2. Start the development server (runs on http://localhost:3051)
pnpm start
# or: pnpm dev

# 3. Run automated tests (11 passing unit & integration tests)
pnpm test

# 4. Build for production
pnpm run build
```

---

## 🧪 Testing

loupeV2 includes an automated test suite covering:
* URL state encoding/decoding and edge cases (`?code=!!!`, Unicode characters).
* AST interpreter execution (custom code, nested recursion, returns).
* Asynchronous Web API timers and DOM event scheduling (`$.on`).
* Narrator updates, history logging, and time-travel snapshot stepping.

```bash
pnpm test
```

---

## 📄 License
ISC License — based on original work by Philip Roberts.
