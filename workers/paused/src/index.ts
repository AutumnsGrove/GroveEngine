/**
 * Grove Paused — Placeholder for retired/paused features
 *
 * Serves a warm, Grove-voiced page explaining the feature is on pause.
 * Deploy under different worker names to replace stale deployments.
 */

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>On Pause — Grove</title>
  <style>
    :root {
      --cream: #faf6f0;
      --bark: #3d2e1f;
      --bark-muted: #7a6b5d;
      --accent: #4a7c59;
      --accent-subtle: rgba(74, 124, 89, 0.08);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --cream: #1a1612;
        --bark: #e8ddd0;
        --bark-muted: #a89880;
        --accent: #6fa87e;
        --accent-subtle: rgba(111, 168, 126, 0.1);
      }
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      background: var(--cream);
      color: var(--bark);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .container {
      max-width: 480px;
      text-align: center;
    }

    .trees {
      font-size: 2.5rem;
      margin-bottom: 1.5rem;
      opacity: 0.7;
      letter-spacing: 0.5rem;
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 400;
      margin-bottom: 0.75rem;
      letter-spacing: -0.01em;
    }

    p {
      font-size: 1rem;
      line-height: 1.7;
      color: var(--bark-muted);
      margin-bottom: 1.5rem;
    }

    a {
      display: inline-block;
      color: var(--accent);
      text-decoration: none;
      padding: 0.5rem 1.5rem;
      border: 1px solid var(--accent);
      border-radius: 0.5rem;
      font-size: 0.9rem;
      transition: background 0.2s, color 0.2s;
    }

    a:hover {
      background: var(--accent);
      color: var(--cream);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="trees">🌲 🌲 🌲</div>
    <h1>This part of the grove is resting.</h1>
    <p>
      We've put this feature on pause while we tend to other parts of the forest.
      It may return in a future season.
    </p>
    <a href="https://grove.place">Back to the grove</a>
  </div>
</body>
</html>`;

export default {
	async fetch(): Promise<Response> {
		return new Response(HTML, {
			headers: {
				"Content-Type": "text/html;charset=UTF-8",
				"Cache-Control": "public, max-age=3600",
				"X-Robots-Tag": "noindex",
			},
		});
	},
};
