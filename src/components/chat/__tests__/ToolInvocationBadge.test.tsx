import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: "call" | "partial-call" | "result" = "call"
): ToolInvocation {
  if (state === "result") {
    return { toolCallId: "id", toolName, args, state, result: "ok" };
  }
  return { toolCallId: "id", toolName, args, state } as ToolInvocation;
}

// --- str_replace_editor labels ---

test("shows 'Creating' for str_replace_editor create command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "create",
        path: "/components/Card.jsx",
      })}
    />
  );
  expect(screen.getByText("Creating /components/Card.jsx")).toBeDefined();
});

test("shows 'Editing' for str_replace_editor str_replace command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "str_replace",
        path: "/components/Card.jsx",
      })}
    />
  );
  expect(screen.getByText("Editing /components/Card.jsx")).toBeDefined();
});

test("shows 'Editing' for str_replace_editor insert command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "insert",
        path: "/components/Card.jsx",
      })}
    />
  );
  expect(screen.getByText("Editing /components/Card.jsx")).toBeDefined();
});

test("shows 'Viewing' for str_replace_editor view command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "view",
        path: "/components/Card.jsx",
      })}
    />
  );
  expect(screen.getByText("Viewing /components/Card.jsx")).toBeDefined();
});

// --- file_manager labels ---

test("shows 'Renaming' for file_manager rename command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("file_manager", {
        command: "rename",
        path: "/components/OldName.jsx",
      })}
    />
  );
  expect(screen.getByText("Renaming /components/OldName.jsx")).toBeDefined();
});

test("shows 'Deleting' for file_manager delete command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("file_manager", {
        command: "delete",
        path: "/components/Card.jsx",
      })}
    />
  );
  expect(screen.getByText("Deleting /components/Card.jsx")).toBeDefined();
});

// --- Fallbacks ---

test("falls back to toolName for unknown tool", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("unknown_tool", { command: "create", path: "/foo.jsx" })}
    />
  );
  expect(screen.getByText("unknown_tool")).toBeDefined();
});

test("falls back to toolName for unknown command on str_replace_editor", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "undo_edit",
        path: "/foo.jsx",
      })}
    />
  );
  expect(screen.getByText("str_replace_editor")).toBeDefined();
});

test("falls back to toolName when args are empty", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {})}
    />
  );
  expect(screen.getByText("str_replace_editor")).toBeDefined();
});

// --- State: call / partial-call → spinner, no green dot ---

test("shows spinner and no green dot for state 'call'", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "create",
        path: "/foo.jsx",
      }, "call")}
    />
  );
  expect(container.querySelector("svg")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("shows spinner and no green dot for state 'partial-call'", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "create",
        path: "/foo.jsx",
      }, "partial-call")}
    />
  );
  expect(container.querySelector("svg")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

// --- State: result → green dot, no spinner ---

test("shows green dot and no spinner for state 'result'", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "create",
        path: "/components/Card.jsx",
      }, "result")}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector("svg")).toBeNull();
});

test("shows human-friendly label in result state", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "create",
        path: "/components/Card.jsx",
      }, "result")}
    />
  );
  expect(screen.getByText("Creating /components/Card.jsx")).toBeDefined();
});
