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
