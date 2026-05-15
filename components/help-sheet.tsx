"use client";

import { useState } from "react";
import { FaQuestion } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSoundEnabled } from "@/components/sound-provider";
import { getHaptics } from "@/lib/haptics";

interface HelpSheetProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function HelpSheet({ externalOpen, onExternalOpenChange }: HelpSheetProps = {}) {
  const { play } = useSoundEnabled();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen ?? internalOpen;
  const setOpen = onExternalOpenChange ?? setInternalOpen;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            data-no-click-sound
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            aria-label="Help"
            onClick={() => {
              play("click");
              getHaptics().trigger("light");
            }}
          />
        }
      >
        <FaQuestion />
      </SheetTrigger>
      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-3xl"
      >
        <SheetTitle className="sr-only">How to play Code Blue</SheetTitle>
        <div className="h-full overflow-y-auto px-6 py-8 sm:px-10">
          <div className="mx-auto max-w-2xl space-y-10">
            <header className="space-y-2">
              <h1 className="text-2xl font-bold">How to play Code Blue</h1>
              <p className="text-muted-foreground">
                A quick tour of every part of our LaPD project, including the shortcuts that make
                it faster.
              </p>
            </header>

            <Section
              title="General controls"
              description="Available from the top bar on every page."
            >
              <Row
                label="Shuffle"
                shortcut={<Shortcut keys={["⇧", "S"]} />}
                description="Open a random case. Respects your Shuffle filter in Settings."
              />
              <Row
                label="Audio"
                shortcut={<Shortcut keys={["⇧", "A"]} />}
                description="Mute or unmute UI sound effects (guess, skip, click, errors)."
              />
              <Row
                label="Theme"
                shortcut={<Shortcut keys={["⇧", "T"]} />}
                description="Cycle through Light → Dark → System."
              />
              <Row
                label="Settings"
                shortcut={<Shortcut keys={["⇧", "R"]} />}
                description="Open the settings drawer to tune the Shuffle filter or reset progress."
              />
              <Row
                label="Help"
                shortcut={<Shortcut keys={["⇧", "?"]} />}
                description="Open or close this guide."
              />
            </Section>

            <Section
              title="Cases (home page)"
              description="The grid of clinical cases at the root URL."
            >
              <Para>
                Each card is a case you can play. Tap one to open it, or use the
                controls above the grid to find something specific.
              </Para>
              <SubHeading>Search</SubHeading>
              <Para>
                The search box matches against case <strong>title</strong>,{" "}
                <strong>author</strong>, and the <strong>created date</strong> (e.g.{" "}
                <code className="rounded bg-muted px-1">Jan 5</code>). Matching is
                case-insensitive.
              </Para>
              <SubHeading>Filter</SubHeading>
              <Para>
                The funnel icon toggles which cases appear in the grid:
              </Para>
              <Bullets>
                <li>
                  <strong>Completed</strong> — cases you&apos;ve solved.
                </li>
                <li>
                  <strong>Failed</strong> — cases where you ran out of clues.
                </li>
                <li>
                  <strong>Unseen</strong> — cases you haven&apos;t attempted yet.
                </li>
              </Bullets>
              <Para>
                Progress is stored locally in your browser, so it&apos;s tied to this
                device.
              </Para>
              <SubHeading>Sort</SubHeading>
              <Para>
                The arrows icon switches between sorting by <strong>Date</strong>{" "}
                (newest first) and <strong>Author</strong> (alphabetical).
              </Para>
              <SubHeading>Create</SubHeading>
              <Para>
                The <strong>+ create a case</strong> button next to the search box
                takes you to the case editor — see the <em>Creating a case</em>{" "}
                section below.
              </Para>
            </Section>

            <Section
              title="Playing a case"
              description="What happens when you open a case from the grid."
            >
              <Para>
                A case is a diagnostic puzzle: six clinical clues are revealed one at
                a time, and your job is to guess the diagnosis from as few clues as
                possible.
              </Para>
              <SubHeading>Reading clues</SubHeading>
              <Para>
                Only the first clue is visible when the case loads. The remaining
                clues are hidden behind{" "}
                <code className="rounded bg-muted px-1">...</code> placeholders. New
                clues appear when you guess wrong or skip.
              </Para>
              <Para>
                If a clue includes an image (lab slide, ECG, X-ray, etc.), click it
                to open the full-size view. Click anywhere on the dark backdrop to
                close.
              </Para>
              <SubHeading>Guessing</SubHeading>
              <Para>
                Type into the diagnosis combobox to search the global list of
                diagnoses. The combobox supports:
              </Para>
              <Bullets>
                <li>
                  <strong>Partial substring match</strong> — earlier matches rank
                  higher.
                </li>
                <li>
                  <strong>Initialisms</strong> — typing{" "}
                  <code className="rounded bg-muted px-1">MI</code> matches{" "}
                  <em>Myocardial Infarction</em>.
                </li>
                <li>
                  <strong>Fuzzy &ldquo;Did you mean?&rdquo;</strong> — typos and
                  close matches appear in a separate group below the direct hits.
                </li>
              </Bullets>
              <Para>
                Use <Shortcut keys={["↓"]} /> and <Shortcut keys={["↑"]} /> to move
                through the list, <Shortcut keys={["↵"]} /> to pick the highlighted
                option, and <Shortcut keys={["Esc"]} /> to close the dropdown. With
                no highlight, pressing <Shortcut keys={["↵"]} /> auto-selects the
                only direct match if there is exactly one.
              </Para>
              <SubHeading>Submitting and skipping</SubHeading>
              <Row
                label="Guess"
                shortcut={<Shortcut keys={["↵"]} />}
                description="Submit the selected diagnosis. Correct ends the game; wrong reveals the next clue."
              />
              <Row
                label="Skip"
                shortcut={<Shortcut keys={["⇧", "↵"]} />}
                description="Reveal the next clue without guessing. Skips are recorded in the log."
              />
              <Para>
                Diagnoses you&apos;ve already guessed wrong are crossed out in the
                dropdown — you can&apos;t pick them again.
              </Para>
              <SubHeading>End of game</SubHeading>
              <Para>
                When you solve a case you get a confetti burst and the result is
                saved as <em>completed</em>. Run out of clues and the case is saved
                as <em>failed</em>. Either way the board stays visible afterwards so
                you can review every clue and your guess history. From the result
                dialog you can <strong>Admire Puzzle</strong>, jump{" "}
                <strong>Back to Cases</strong>, or shuffle into a{" "}
                <strong>Random Puzzle</strong>.
              </Para>
            </Section>

            <Section
              title="Creating a case"
              description="The case editor at /editor — reachable from the + create a case button."
            >
              <Para>A case has four parts:</Para>
              <Bullets>
                <li>
                  <strong>Title</strong> — required. The headline shown on the card
                  (e.g. <em>&ldquo;Headache&rdquo;</em>).
                </li>
                <li>
                  <strong>Author</strong> — optional, max 14 characters. Leave blank
                  to publish anonymously.
                </li>
                <li>
                  <strong>Correct Diagnosis</strong> — search the global diagnosis
                  list and select the right answer. If your diagnosis doesn&apos;t
                  exist yet, type its full name and choose{" "}
                  <strong>+ Create &ldquo;…&rdquo;</strong> at the bottom of the
                  dropdown. You&apos;ll be asked to confirm before it&apos;s added
                  globally, so double-check spelling and existing variants first.
                </li>
                <li>
                  <strong>Six clues</strong> — all six text fields are required.
                  Order them from <em>least</em> to <em>most</em> revealing so the
                  puzzle gets easier as it progresses. Each clue can optionally
                  include an image via <strong>+ Add image</strong>; click the ✕ to
                  remove an attached image.
                </li>
              </Bullets>
              <Para>
                Hit <strong>Submit Case</strong> when you&apos;re done. The case
                publishes immediately and shows up on the home page for everyone.
              </Para>
            </Section>

            <Section
              title="Anki packs"
              description="The /anki page in the top nav."
            >
              <Para>
                A small library of Anki flashcard decks for study. Each entry shows a
                name and short description. Click <strong>Download</strong> to save
                the <code className="rounded bg-muted px-1">.apkg</code> file, then
                import it into Anki on your device.
              </Para>
            </Section>

            <Section
              title="Settings"
              description="Opened with the gear icon or Shift+R."
            >
              <SubHeading>Shuffle filter</SubHeading>
              <Para>
                Chooses which categories the <strong>Shuffle</strong> button pulls
                from: Completed, Failed, and/or Unseen. The filter applies to both
                the top-bar Shuffle button and the Random Puzzle button on the
                end-of-game dialog. At least one category must stay selected.
              </Para>
              <SubHeading>Reset progress</SubHeading>
              <Para>
                Clears every saved attempt from your browser&apos;s local storage.
                After a reset, every case becomes <em>unseen</em> again. This cannot
                be undone, so you&apos;ll be asked to confirm.
              </Para>
            </Section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1 border-b pb-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="pt-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed">{children}</p>;
}

function Bullets({ children }: { children: React.ReactNode }) {
  return (
    <ul className="ml-5 list-disc space-y-1.5 text-sm leading-relaxed marker:text-muted-foreground">
      {children}
    </ul>
  );
}

function Row({
  label,
  shortcut,
  description,
}: {
  label: string;
  shortcut?: React.ReactNode;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="space-y-0.5">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
      {shortcut && <div className="sm:pt-0.5">{shortcut}</div>}
    </div>
  );
}

function Shortcut({ keys }: { keys: string[] }) {
  return (
    <KbdGroup>
      {keys.map((k, i) => (
        <Kbd key={i}>{k}</Kbd>
      ))}
    </KbdGroup>
  );
}
