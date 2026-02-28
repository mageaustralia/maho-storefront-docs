# Review Controller

The review controller handles product review submission and rating display.

**Source:** `src/js/controllers/review-controller.js` (~200 lines)

## Targets

| Target | Element | Purpose |
|--------|---------|---------|
| `form` | Review form | Submission form |
| `rating` | Star rating inputs | 1-5 star selection |
| `nickname` | Name input | Reviewer display name |
| `title` | Summary input | Review title |
| `detail` | Review body textarea | Full review text |
| `submitButton` | Submit button | Disabled during submission |
| `message` | Feedback area | Success/error messages |

## Actions

| Action | Trigger | Behavior |
|--------|---------|----------|
| `setRating` | Click/hover star | Set rating value (1-5) |
| `submit` | Form submission | POST review to API |

## Review Submission

1. User fills out rating (required), nickname, title, and detail
2. Form validation ensures rating is selected
3. POST to Maho API review endpoint
4. On success: display "Thank you" message, hide form
5. Reviews may require admin approval before appearing

## Star Rating UX

Interactive star rating with hover preview:

- Hovering over a star highlights it and all preceding stars
- Clicking locks the selection
- Visual feedback uses CSS-only star rendering (no images)

Source: `src/js/controllers/review-controller.js`
