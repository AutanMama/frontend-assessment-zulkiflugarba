How constraints 1 and 2 were satisfied together

Every row stays a real DOM element at all times, no virtualisation. That is what keeps constraint 1 working, Ctrl-P prints every filtered row, not just what is visible, and native Ctrl-F works too, since both operate on the actual DOM, not React state. For constraint 2 without virtualisation, each row is its own OrderRow component wrapped in React.memo, so a row only re-renders when its own props change, not whenever the parent re-renders. That required every prop passed to a row to stay referentially stable: filteredOrders and selectedStatuses use useMemo, handlers use useCallback, and per-row ref callbacks are cached in a Map so the same function is reused across renders.

Three decisions, what was rejected, and why

One, content stays in the DOM instead of being virtualised. The rejected alternative was @tanstack/react-virtual, faster to build but breaks printing and native find, since virtualised rows do not exist in the DOM until scrolled into view.

Two, filter state lives in the URL through a hand written hook using history.replaceState and a popstate listener, not a routing library. React Router was rejected since the brief allows only one extra dependency, and it has to be for the table or list, not routing.

Three, replaceState is used for every search and filter change instead of pushState. The back button leaves the page entirely rather than stepping through each keystroke, since no history entries were ever added. pushState on every change was rejected because it would flood history with one entry per keystroke.

What was not finished, and a bug found along the way

handleKeyDown reads filteredOrders and openOrderId through refs rather than closing over them directly, to keep its own reference stable so opening or closing the panel does not force every row to re-render. This was found during testing: an early version depended on filteredOrders directly, so typing created a new array reference every keystroke and defeated memoisation entirely, confirmed with a render counter showing all 5,000 rows re-rendering twice per keystroke under React 18 StrictMode. After moving to refs, the same test showed zero row re-renders for the same keystroke. Evidence for both states is in /evidence.

useEffect is used once, for the popstate listener catching the browser back and forward buttons, since that listens to a browser event outside React's control, not derived state.
