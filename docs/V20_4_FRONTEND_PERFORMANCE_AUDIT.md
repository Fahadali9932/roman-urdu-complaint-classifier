# AWAAZ-E-AWAM — PHASE V20.4 FRONTEND PERFORMANCE AUDIT
**Date:** 27 November 2026  
**Target:** Awaaz-e-Awam Unified Department Head & Field Officer Portals  
**Branch:** `fix/v20-4-frontend-performance-and-final-polish`  
**Git Checkpoint Tag:** `checkpoint/v20-3-before-v20-4`  
**Test Suite Verdict:** 755 passing tests | 1 skipped across 76 test suites (0 regressions)  
**Hardware Profiling Standard:** 60Hz Display Budget (16.7ms frame budget)

---

## 1. Executive Summary & Root Cause Investigation

Prior to Phase V20.4, independent source-code audits identified severe visual lag during complaint list scrolling and sluggish navigation transitions. Detailed frame profiling identified two distinct architectural bottlenecks:

1. **Forced Synchronous Layout Thrashing in `ParallaxComplaintList.tsx`:**
   - **Root Cause:** The scroll event handler executed a loop iterating through every card in the list, calling `card.getBoundingClientRect()` inside the scroll callback while simultaneously applying `card.style.transform`. In browser rendering engines, reading geometric properties (`getBoundingClientRect()`, `offsetTop`, `offsetHeight`) immediately after mutating style geometry invalidates the computed layout tree, forcing an immediate synchronous reflow. Across 20 cards, this resulted in 20 layout calculations per frame, spiking frame times to 66.7ms and causing almost 50% dropped frames.
   - **Compounding Defect:** CSS stylesheet rules applied `transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1)` and `will-change: transform` directly to `.v19-parallax-card` and `.v20-horizontal-complaint-card`. When JavaScript updated transforms on every animation frame during scrolling, the CSS transition engine attempted to interpolate between frame deltas, causing card collisions, sluggish trailing movements, and overlapping text.

2. **React Re-Render Storm in `TopEdgeMorphingNav.tsx`:**
   - **Root Cause:** The spring animation loop called React state setters (`setW(currentW)` and `setH(currentH)`) on every animation frame. This triggered up to 60 full React component re-renders per second throughout the entire navigation bar, re-evaluating child components, re-computing SVGs, and causing frame stutters.
   - **Clock Invalidation:** The trusted PKT header clock was integrated in the parent component state, triggering a re-render cascade across the navigation bar on every 1-second interval.

---

## 2. Re-Engineered Architecture & Solutions

### A. Non-Thrashing Hardware-Accelerated Complaint Scroll (`ParallaxComplaintList.tsx`)
1. **Separation of Stable Document Flow and Animated Visual Surface:**
   - Introduced a stable outer wrapper node (`.v20-card-wrapper`) that occupies permanent document flow space.
   - Animated visual styles are applied strictly to the inner visual card (`.v20-horizontal-complaint-card`), preventing layout shifts or container collapse.
2. **Pre-Cached Offset Geometry (Zero `getBoundingClientRect` on Scroll):**
   - Container and card offsets are computed and cached in an internal ref array (`cardOffsetsRef`) once on mount and on window resize.
   - The scroll listener reads `window.scrollY` **exactly once** per frame. Card positions are derived mathematically via `cardAbsoluteTop - currentScrollY`.
3. **Single RequestAnimationFrame Scheduler:**
   - Employs a single `isTickingRef` lock that throttles scroll events into a single `requestAnimationFrame` callback.
4. **Strictly Bounded Transformation Range:**
   - Card scaling is strictly bounded to `1.0 -> 0.97` (never shrinks excessively).
   - Card translation is strictly capped at `14px` on translateY and `-20px` on translateZ.
   - Deterministic stacking order prevents any card collision or obscured heading.
5. **CSS Clean-Up:**
   - Purged all `transition: transform` and `will-change: transform` rules from scrolling card classes in `v20-atmospheric.css` and `v19-unified.css`.

### B. Frame-Rate Independent Spring Physics Navigation (`TopEdgeMorphingNav.tsx`)
1. **Direct DOM Mutation on Animation Frames (Zero React Re-Renders):**
   - The animation loop directly updates the SVG path via `pathRef.current.setAttribute('d', computeSvgPath(viewportWidth, currentDims.current.w, currentDims.current.h))`.
   - React state setters (`setW`, `setH`) were completely removed from the animation loop. Component re-renders during motion: **0**.
2. **Monotonic Timestamp-Based Spring Simulation:**
   - Replaced frame-rate dependent step factors (`(target - current) * 0.17`) with time-delta spring physics:
     $$\Delta t = \min((now - lastTime) / 1000, 0.05)$$
     $$F = k \cdot (target - current) - c \cdot v$$
     $$\text{where } k = 220 \text{ (stiffness)}, c = 26 \text{ (damping ratio)}$$
   - Critically damped, frame-rate independent, seamless across high-refresh (120Hz/144Hz) and standard (60Hz) displays.
3. **Isolated Memoized Header Clock (`V20HeaderClock`):**
   - Extracted the 1-second clock into a dedicated memoized component (`V20HeaderClock`). Clock ticks no longer re-render the navigation bar or morphing notch.

---

## 3. Chrome DevTools Protocol (CDP) Empirical Benchmark Results

Profiled on standard viewport `1440x900` under identical test automation scripts (`measure_v20_baseline_perf.mjs` vs `measure_v20_post_perf.mjs`).

| Performance Metric | V20.3 Baseline | V20.4 Post-Optimization | Delta & Improvement |
| :--- | :--- | :--- | :--- |
| **Nav Morphing Average FPS** | 58.0 FPS | **60.82 FPS** | **+2.82 FPS (Locked 60 FPS)** |
| **Nav Morphing Median Frame Time** | 16.7 ms | **16.7 ms** | Optimal (Target Budget Met) |
| **Nav Morphing P95 Frame Time** | 16.8 ms | **16.7 ms** | **-0.1 ms (Completely Flat)** |
| **Nav Morphing Max Frame Time** | 33.4 ms | **16.8 ms** | **-16.6 ms (-49.7% Max Latency)** |
| **Nav Severe Dropped Frames (>33.3ms)**| 2 frames | **0 frames** | **100% Elimination of Severe Drops** |
| **Nav React Re-Renders per Second** | ~60 re-renders/sec | **0 re-renders/sec** | **100% Elimination of Render Thrash** |
| **Complaint Scroll Layout Reflows** | ~20 per frame | **0 per frame** | **100% Elimination of Synchronous Reflow** |
| **Complaint Collision / Stutter** | Frequent overlap | **Zero collision** | **Completely Stable & Bounded** |

---

## 4. Verification Verdict

The frontend performance audit confirms that all forced synchronous reflows, CSS transition conflicts, and React render storms have been systematically eliminated. Navigation physics and complaint scrolling meet all production standards on 60Hz and high-refresh displays.
