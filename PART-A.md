Pre-Screening Assessment - Front-End Engineering

Position applied for: Senior Front-End Developer

Section 1 - Code

Q1

The developer's explanation is wrong because React.memo does not perform a deep comparison of props, it uses a shallow comparison, checking whether each prop has the same reference. Wrapping columns in useMemo works because it keeps the same array reference between renders unless its dependencies change.

However this fix alone will not work if other props still receive new references on every render. Two examples are inline functions such as onEdit={() => handleEdit(product)} and onDelete={() => handleDelete(product)}.

The actual cause of the re-render is changing prop identities between renders, while the performance cost comes from having to re-render every row in the table.

Q2

This code has three defects, ranked most to least severe.

1. A failed update leaves the UI showing a status that was never saved. The optimistic patch applies before the request completes, and nothing rolls it back on failure. The user sees the change stick with no error shown, even though the server rejected it. This is worst because it silently shows wrong information with no way to know it is wrong.

2. The optimistic update only ever patches the getProducts cache entry for an empty filter object. With real filters applied, that entry does not match what is on screen, so filtered views do not update immediately. Less severe, since the underlying data is not wrong, only the optimistic experience is missing.

3. getProducts and updateProductStatus both use the same generic Product tag with no id. A successful update to one product invalidates and refetches every cached filtered view, not just the one that changed, causing unnecessary requests and flicker. Least severe, since the data stays correct, it is a performance cost, not a correctness problem.

One comment makes a false claim. It says the invalidation will refetch anyway, but invalidatesTags only fires when the mutation succeeds, not when it fails. So on a failed request, no refetch happens and the bad optimistic patch is never corrected.

One thing looks like a defect but is not. row.status = status inside the updateQueryData callback looks like a direct state mutation. It is fine because draft is an Immer draft, not the real Redux state. RTK Query uses Immer internally, so this pattern is intended, and Immer produces the correct immutable update behind the scenes.

Q3

Rewrite:

export function useSupplierName(supplierId: string) {
  const { data, isLoading, isError } = useGetSupplierQuery(supplierId);
  return { name: data?.name ?? '', isLoading, isError };
}
export const SupplierBadge = memo(function SupplierBadge({ supplierId }) {
  const { name, isLoading, isError } = useSupplierName(supplierId);
  if (isLoading) return <Skeleton className="h-5 w-24" />;
  if (isError) return null;
  return (
    <span className="rounded bg-muted px-2 py-0.5 text-xs">
      {name.toUpperCase()}
    </span>
  );
});

I removed the local name state and the useEffect that copied data.name into it. That state was fully derivable from data, and copying it through an effect meant name only updated one render after data changed, which is a specific bug, not just an inefficiency.

I also removed the useMemo around toUpperCase. Uppercasing a short string is cheap enough that useMemo's own bookkeeping, storing the last value and comparing dependencies, costs more than just recomputing it every render. It was memoizing something not worth memoizing.

The state and effect removal also fixes a real user visible bug. When the same row component is reused for a different supplier, for example after sorting or filtering changes which supplierId a row receives, the sequence was: the row shows Supplier A, the component receives Supplier B's id, useGetSupplierQuery returns B's data, but local name still holds A. The component renders once showing A's name against Supplier B's row, then the effect runs afterward and updates name to B, causing a second render with the correct value. For that one render, the row displays another row's supplier name. Returning data?.name directly removes that stale state entirely, so the badge is always in sync with the current supplierId.

Separately, the rewrite does not solve the problem at 200 rows: each SupplierBadge instance calls useGetSupplierQuery with its own supplierId, so 200 rows can trigger up to 200 separate queries and network requests if none are cached yet. That is not something this component can fix on its own. The real fix belongs in the data fetching layer, either batching supplier lookups into one request for all visible ids, or including the supplier name directly in the product list response so no per row query is needed at all.

Q4

The painted values, in order, are idle, then saving, then idle.

saved is assigned but never painted. setLabel('saved') and the final setLabel(label === 'saving' ? 'done' : label) both run in the same synchronous stretch of code after the await resolves, with no render in between. label inside that final line is not a live value, it is frozen at whatever the state was on the render that created this onClick closure, which is idle from before the click. So that line evaluates to setLabel('idle'). React 18 batches both calls together and only paints once, using the last value, so saved is calculated but overwritten before it ever reaches the screen.

The final displayed value is idle, identical to the state before the user ever clicked. The user loses any confirmation that the update actually succeeded, the button looks exactly as if nothing happened.

The smallest fix is to delete the final line entirely:

setLabel(label === 'saving' ? 'done' : label);

That line only exists to read a stale closure value and stomp on whatever the try or catch block just correctly set. Removing it lets the saved or failed value set inside the try/catch stand as the final, correctly painted state.

Section 2 - Design and judgement

Q5

Design:

function assertNever(x: never): never {
  throw new Error('Unhandled case: ' + x);
}

function messageForCode(code: ErrorCode): string {
  switch (code) {
    case 'SUPPLIER_LOCKED': return 'This supplier is locked.';
    case 'STOCK_NEGATIVE': return 'Stock cannot go below zero.';
    case 'IMPORT_IN_PROGRESS': return 'An import is already running.';
    case 'VALIDATION_FAILED': return 'Some fields are invalid.';
    case 'RATE_LIMITED': return 'Too many requests, try again shortly.';
    default: return assertNever(code);
  }
}

function handleApiResponse<T>(
  response: ApiResponse<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (message: string, field?: string) => void;
  }
): void {
  if (response.error === null) {
    options.onSuccess?.(response.data);
    return;
  }
  try {
    options.onError?.(messageForCode(response.error.code), response.error.field);
  } catch {
    options.onError?.(response.error.message, response.error.field);
  }
}

A form calls it with onError: (message, field) => setFieldError(field, message). A table calls it with onError showing a toast. A background poll omits onError entirely and stays silent. None of the three ever touch response.data or response.error directly.

data ends up non-null on the success branch with no cast because ApiResponse is a discriminated union. Checking response.error === null narrows the whole union, since the two variants are structurally linked, so TypeScript already knows data is T in that branch.

Adding a new ErrorCode member becomes a compile error because the switch's default branch relies on code being narrowed to never once every existing case is handled. A new unhandled member breaks that narrowing, so passing it to assertNever(x: never) no longer type checks, and the build fails.

An unrecognized runtime code is different: TypeScript cannot catch it, it only exists once the app is running. If assertNever simply threw, the error would escape and the user would see nothing. So the catch around it falls back to response.error.message, always present and readable regardless of whether the code is known, so an unfamiliar code still reaches the user.

error.field is just a string with no relationship to the form's real field names. If the backend sends a name the form does not recognize, setFieldError attaches to nothing and the message is silently lost. TypeScript cannot catch this either, field is untyped against the form's actual fields. The real fix belongs at the API contract boundary: a shared naming convention, or a mapping layer that normalizes backend field names before the form sees them.

Q6

Reject the proposal. Virtualising removes off screen rows from the DOM entirely, only rows in the viewport exist as real elements. Ctrl-P and Ctrl-F both operate on the actual DOM, not React state, so both break: printing would only capture the handful of rows on screen instead of all 3,000 filtered rows, and native find would miss an order number in a row that is not currently rendered. That breaks the warehouse floor's real workflow of printing a full filtered sheet and finding an order before printing it.

Instead I would use content-visibility: auto on each row. Every row stays a real DOM node with real text, so Ctrl-P and Ctrl-F keep working, but the browser skips layout and paint for off screen rows, which is likely most of the six seconds, without removing anything from the DOM.

The cost: DOM node count and memory usage do not shrink, all 3,000 rows are still managed by the browser and React. It scales worse than true virtualisation, so well beyond a few thousand rows this stops being enough, and a separate print specific render alongside virtualisation would eventually be needed.

Q7

I would fix the three forms. Silent data loss is worse than a slow load, a user can type real information, hit submit, and lose everything with no warning, which damages trust far more in a live demo than a four second freeze that is at least explainable.

The 12,000 row table still freezes for about four seconds, that stays broken. To the person who wanted virtualisation: the performance issue is real, but it is recoverable, you can narrate through a slow load. Losing typed input live is not recoverable once it happens, so it is the higher risk problem with only two days, and virtualisation should follow right after the demo.

Q8

Requirement 2 and 3 conflict. Select all can match products on pages not yet loaded, so the frontend does not know their SKUs, but requirement 3 needs the exact list shown before applying. It cannot show what it does not have.

Requirement 4 and 5 conflict. A selection above 500 needs multiple requests, since the API caps each one at 500 ids. Split across several requests, there is no single transaction guaranteeing every product updates or none does, a later request can fail after earlier ones already succeeded.

Requirement 5 and 6 conflict. True atomicity only has two outcomes, everything succeeded or nothing did. A toast reporting how many succeeded and how many failed only makes sense if partial outcomes are possible, which contradicts all or nothing.

Requirement 2 versus 3: keep requirement 2, selecting everything matching a filter is a genuine need. Ticket: a server side lookup resolving the full SKU list before the confirmation dialog shows it. Question: should the dialog load every matching SKU even if there are thousands.

Requirement 4 versus 5: keep requirement 5, atomicity is the stronger guarantee for a price change. Ticket: a dedicated bulk endpoint performing the update as one server side transaction, or a documented rollback strategy per batch. Question: can the backend provide one atomic bulk operation instead of the frontend sending batches of 500.

Requirement 5 versus 6: keep requirement 5 again. Ticket: change the toast to report one outcome, all succeeded or all failed, not partial counts. Question: do you actually expect partial success, or must this be strictly all or nothing.

Requirement 1 is the only one that survives completely unchanged, it never appears in any conflict.

Section 3 - Review and judgement under pressure

Q9

Verdict: request changes.

1. FilterBar.tsx: clear() sets window.location.href = '/products', a full page navigation, which directly breaks AC-2's requirement to clear without a full reload. Author should reset suppliers to an empty array and call onChange or apply instead of navigating.

2. FilterBar.tsx: the Add button pushes draft into suppliers but never resets draft afterward, and does not guard against an empty string. Clicking Add repeatedly without changing the input adds duplicates, and an empty draft can be added as a supplier. Author should clear draft after adding and skip the add when draft is empty.

3. FilterBar.tsx: the description claims this converts the filter bar to a controlled component, but suppliers and draft are still local state with no effect syncing them from the value prop. If value changes externally, the displayed filters will not reflect it. Author should either actually derive the UI from value, or remove the controlled component claim from the description.

4. useProducts.ts: refetchOnMountOrArgChange: true is unrelated to both acceptance criteria and changes caching behavior for every consumer of this shared hook, not just the filter bar. Author should justify this separately or move it to its own change.

5. date.ts: the comment asserts formatDate was moved unchanged from OrderTable.tsx, but the diff does not show the original OrderTable.tsx code being removed, so that claim cannot be verified from this diff alone. Author should include the removal from OrderTable.tsx in the same diff.

I deliberately did not comment on toLocaleDateString() itself, since the helper is stated as moved unchanged and no acceptance criterion specifies a required date format, so it is not a defect demonstrated by this change.

AC-1, multiple suppliers: met. suppliers is an array and apply passes it through onChange.

AC-2, clear without full reload: not met. window.location.href causes a full navigation.

Q10

First, freeze development, nobody pushes, merges, rebases, or force-pushes until this is resolved, and I lock the branch if I have permission. I tell the two blocked developers immediately not to push anything, recovery is starting. I record the current remote SHA and the last known good SHA before the force-push. Force-pushes do not delete commit objects or touch local reflogs, so I check the force-pusher's own reflog first, since it still has every position that branch pointed to, along with any other local clone that had pulled recently, and the host's PR refs for the four missing branches. I ask everyone not to run cleanup or reset commands that could prune that history. Once the commits are identified, I restore development and recover the PR branches from whichever source still has their tips. Another developer verifies the recovered history before I tell the two developers it is safe to resume.

I would not escalate to the business owner while this is contained and production is unaffected, only if recovery fails, runs long, or threatens a deadline, with the impact and plan attached.

Permanently: development becomes a protected branch, force-pushes are disallowed for normal contributors, changes go through pull requests. Whoever controls repository governance has to agree to that.

Q11

Message to the developer:

I know you're capable of handling large changes, and I'm not questioning your ability. The concern is the risk that comes with putting 900+ lines and no tests into one change. It makes it harder to spot problems, harder for someone else to verify the work, and much more expensive to fix something after it reaches users. It also puts reviewers in a difficult position when we're under deadline pressure. I'd like us to break larger work into smaller, meaningful pieces and add tests around important behavior. The goal isn't more process for its own sake, it's to help us move faster with less rework and make sure your good work stays reliable as the team and product grow.

Message to the business owner:

I agree that we should ship features faster. One thing that can slow us down is releasing large changes without enough checking beforehand. When something goes wrong, we can spend much more time finding and fixing it, which delays the next feature and can affect customers. I'd like us to make changes smaller and easier to verify so we can release confidently and spend less time fixing problems after release. This helps us ship faster without sacrificing reliability.

Section 4 - Experience

Q12

I built the authentication and payment request flow myself, both frontend and backend, in an application I work on. A user would enter their password successfully, and the flow would move to the next step asking for a verification code, but the screen gave no way to actually enter that code. The user was stuck with no path forward.

The issue was reported to me. I traced it back to code I had written, fixed the flow, and tested it end to end to confirm a user could complete the entire process. I do not know exactly how long the bug had been live before it was reported.

Afterward, I became more deliberate about testing complete user journeys, especially authentication flows, rather than checking individual screens or API responses in isolation. A screen can work perfectly on its own and still leave a user with no way to move forward if the step after it was never actually testable end to end.

Q13

Naphtech, Maker/Checker dashboard: used by business and organization administrators on a financial administration platform to control staff activities and approvals. The API already existed, I accessed the endpoints and JSON structures through Bitbucket credentials provided by my boss, and confirmed unclear requirements directly with the API provider. The hardest part was implementing the role based Maker/Checker flow so actions could be controlled and approved by the appropriate users.

Spectrum Management System, application and workflow screens: used by telecom operators applying for spectrum licences and by NCC officers processing those applications. I integrated with the existing NCC eService API rather than building it myself, using the provided endpoints and contract. The hardest part was the workflow, ensuring applications were correctly routed through assignments, permissions, and multiple approval stages. I also fixed routing issues that were preventing applications from reaching the correct officers.
