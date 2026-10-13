# You steer from the board

You don't need to watch the terminal. The board shows every issue as the
agent moves it, live from the files.

- **Assignee, not status, says who's driving.** When the agent needs you, it
  sets `assignee: human` and writes its questions into the issue. Status never
  moves backward.
- **Needs you** lists exactly what waits on you, across every repo: questions
  to answer, checks to do, blocked work.
- **Done means verified.** Review is optional and comes later: mark issues
  `reviewed` when you've looked, `deployed` when they ship.
- **Copy agent prompt** on any issue or project gives you the sentence that
  hands it back to an agent.

That's the loop: you decide and steer, the agent builds, the files remember.
