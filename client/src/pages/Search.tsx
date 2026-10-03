import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchUsers, type SearchUser } from "../services/user.services";

function Search() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) {
      setUsers([]);
      setHasSearched(false);
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const response = await searchUsers(query.trim());

      if (response.success) {
        setUsers(response.data.users);
      }
    } catch {
      setError("Failed to search people.");
    } finally {
      setIsLoading(false);
      setHasSearched(true);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-text">
            Find People
          </h1>

          <p className="mt-1 text-sm text-muted">
            Search for professionals on ConnectSphere.
          </p>
        </div>

        {/* Search */}
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="Search people by name..."
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-text outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
            />

            <button
              type="button"
              onClick={handleSearch}
              disabled={isLoading}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? "Searching..." : "Search"}
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Results */}
        {hasSearched && !isLoading && users.length === 0 && (
          <section className="rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-sm">
            <h2 className="font-semibold text-text">
              No people found
            </h2>

            <p className="mt-1 text-sm text-muted">
              Try searching with a different name.
            </p>
          </section>
        )}

        {users.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-6 py-5">
              <h2 className="font-bold text-text">
                People
              </h2>

              <p className="mt-1 text-sm text-muted">
                {users.length} result{users.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="divide-y divide-border">
              {users.map((person) => (
                <button
                  key={person._id}
                  type="button"
                  onClick={() =>
                    navigate(`/app/profile/${person._id}`)
                  }
                  className="flex w-full items-center gap-4 px-6 py-5 text-left transition hover:bg-background"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                    {person.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-semibold text-text">
                      {person.name}
                    </h3>

                    <p className="mt-1 truncate text-sm text-muted">
                      {person.headline || "ConnectSphere member"}
                    </p>
                  </div>

                  <span className="ml-auto text-sm font-semibold text-primary">
                    View Profile →
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default Search;