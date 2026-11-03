# Myrtle: Fly Snack Adventure

A separate browser game for Myrtle, the little black kitten. Published at `/myrtle/` alongside the Sage & Pips game.

- Myrtle is the only playable character. Move with arrows or A/D, and jump with Space, Up, W, or the phone controls.
- Touch a fly to munch it automatically: +200 points, with no energy loss. Other bugs cost one energy point, including when landed on.
- Five energy points, treats restoring one point, feeders restoring up to two, and a safe landing point after falling.
- Reach Sage and Pips near the far end for +500 points and a continuous animated playdate with all three cats. Use Restart to play again.
- The speaker button controls the gentle original music and sound effects.

The route reuses `../game/music.js`, `../game/assets/cats-and-enemies.png`, `../game/assets/items.png`, and the existing cat sounds under `../iphone/`. Phone controls stay outside the 16:9 picture.

Myrtle's original sprite sheet is `assets/myrtle-sprites.png`. It was generated with the built-in image tool from the supplied cat photographs, then copied into this project. No photographs are included in the published site.

## Sprite prompt

Generate one transparent 4-column, 3-row pixel-art atlas of Myrtle only: a sleek black short-haired kitten with large ears, a long thin tail, pale yellow-green eyes, charcoal highlights, no collar, and no white markings. Use the supplied Myrtle photos as identity references and the existing Sage/Pips atlas as a style reference. Twelve full-body right-facing poses: alert idle, blink idle, two walking steps, two running strides, jump, munch, lick, play bow, pounce, landing crouch. Keep equal cells, consistent scale, generous padding, clean pixel edges, and no text, gridlines, props, insects, people, or extra animals.
