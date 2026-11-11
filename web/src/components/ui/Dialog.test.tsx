import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./Dialog.tsx";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "./Select.tsx";

function Harness() {
  return (
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <DialogTitle>Title here</DialogTitle>
        <DialogDescription>A description.</DialogDescription>
        <DialogClose>Close</DialogClose>
      </DialogContent>
    </Dialog>
  );
}

describe("<Dialog>", () => {
  it("opens when trigger is clicked and shows title/description", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.queryByText("Title here")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Title here")).toBeInTheDocument();
    expect(screen.getByText("A description.")).toBeInTheDocument();
  });

  it("closes when the close button is clicked", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    // Base UI Dialog has a 150ms fade-out transition before unmount.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("<Dialog> guards", () => {
  function WithSelect({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
    return (
      <Dialog open onOpenChange={onOpenChange} disablePointerDismissal>
        <DialogContent>
          <DialogTitle>Edit</DialogTitle>
          <Select items={{ a: "Alpha", b: "Beta" }} defaultValue="a">
            <SelectTrigger aria-label="Letter">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value="a">Alpha</SelectItem>
              <SelectItem value="b">Beta</SelectItem>
            </SelectPopup>
          </Select>
          <input aria-label="Name" />
        </DialogContent>
      </Dialog>
    );
  }

  it("Esc in an open select closes only the select", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<WithSelect onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("combobox", { name: "Letter" }));
    expect(await screen.findByRole("option", { name: "Beta" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("option", { name: "Beta" })).not.toBeInTheDocument());
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("Esc with nothing else open closes the dialog", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<WithSelect onOpenChange={onOpenChange} />);
    await user.keyboard("{Escape}");
    expect(onOpenChange.mock.calls[0]?.[0]).toBe(false);
  });

  it("an outside press leaves a form dialog open", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<WithSelect onOpenChange={onOpenChange} />);
    await user.click(document.body);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("focus lands on the data-autofocus field", async () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>T</DialogTitle>
          <input aria-label="First" />
          <input aria-label="Second" data-autofocus />
        </DialogContent>
      </Dialog>,
    );
    await waitFor(() => expect(screen.getByLabelText("Second")).toHaveFocus());
  });
});
