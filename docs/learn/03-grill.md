# Grill me: agree before you build

The most expensive agent mistake isn't bad code — it's good code for the
wrong thing. An agent fills every gap in your request with a guess, and you
find out when you read the diff.

"Grill me" turns that around. The agent interviews you about the plan, one
question at a time, each with the answer it would recommend, walking down
every branch of the decision tree until nothing is open. When the code can
answer a question, it looks instead of asking.

What comes out is a shared understanding: the same picture of the work in
your head and in the conversation. `grill-with-docs` goes one step further and
records new terms in the glossary and hard-to-reverse decisions as ADRs while
you talk.

Use it whenever a request is more than one obvious step. It feels slow, and
it's the cheapest part of the loop.

Go deeper: [grill-me](https://www.aihero.dev/skills-grill-me) and
[grill-with-docs](https://www.aihero.dev/grill-with-docs) by Matt Pocock, who
borrows the *design tree* from Frederick P. Brooks' *The Design of Design*.
