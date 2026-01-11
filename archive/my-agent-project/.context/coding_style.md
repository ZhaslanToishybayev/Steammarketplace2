# Antigravity Coding Standards & Best Practices

## Architecture
1.  **Tool Isolation**: All external interactions (API calls, file I/O, system commands) MUST be encapsulated in functions within the `tools/` directory.
2.  **Pydantic Everywhere**: Use `pydantic` models for function arguments/returns in Python tools.

## Python Style (Agent Tools)
1.  **Type Hints**: Mandatory (`def my_func(a: int) -> bool:`).
2.  **Docstrings**: Google-style required.

## Frontend Style (SteamMarketplace / Next.js)
1.  **React Hooks**: Use custom hooks (`useCachedInventory`, `usePrefetching`) instead of raw `useEffect` where possible to maintain abstraction.
2.  **Components**: Keep components small (< 200 lines). If larger, split into sub-components.
3.  **Tailwind**: Use utility classes. Do not write raw CSS files unless adding a global animation.
4.  **Types**: Avoid `any`. Define interfaces for all API responses, especially Steam Inventory items.
5.  **Performance**:
    - Use `React.memo` for list items (Inventory Cards).
    - Use `useCallback` for event handlers passed to children.

## Backend Style (Node.js)
1.  **Async/Await**: Use modern async/await, avoid callback hell.
2.  **Error Handling**: Wrap routes in try/catch blocks. Send standardized JSON error responses.
3.  **Logging**: Log significant events (login, purchase) but sanitize sensitive data.
