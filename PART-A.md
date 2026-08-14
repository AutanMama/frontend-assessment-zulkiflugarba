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
