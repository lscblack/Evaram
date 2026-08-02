"""
In-house captcha.

Deliberately not Google reCAPTCHA: it keeps visitor data in-country, adds no
third-party request to the page, and lets us tune difficulty per endpoint. The
answer is never sent to the client — only a token and a rendered SVG.
"""

import random
import secrets
from dataclasses import dataclass

_OPERATIONS = ("+", "-", "×")
_WORDS = ("plot", "land", "title", "house", "deed", "acre", "survey", "tenure")


@dataclass(slots=True)
class Challenge:
    token: str
    answer: str
    prompt: str
    svg: str


def _rotate(seed: int, index: int) -> float:
    return ((seed >> (index * 3)) % 25) - 12


def _render_svg(text: str, seed: int) -> str:
    """
    Draws the answer text as distorted SVG glyphs plus noise. Rendering it
    server-side means the plaintext never appears in the DOM.
    """
    rng = random.Random(seed)
    width, height = 190, 62
    chars = []
    for i, ch in enumerate(text):
        x = 22 + i * (140 / max(len(text), 1))
        y = 40 + rng.randint(-5, 5)
        rotation = _rotate(seed, i)
        fill = rng.choice(("#062b4f", "#0f3a63", "#7f4e1c", "#a06520"))
        chars.append(
            f'<text x="{x:.1f}" y="{y}" fill="{fill}" font-family="Georgia,serif" '
            f'font-size="{rng.randint(26, 34)}" font-weight="700" '
            f'transform="rotate({rotation:.1f} {x:.1f} {y})">{ch}</text>'
        )

    noise = []
    for _ in range(6):
        x1, y1 = rng.randint(0, width), rng.randint(0, height)
        x2, y2 = rng.randint(0, width), rng.randint(0, height)
        noise.append(
            f'<path d="M{x1} {y1} Q {rng.randint(0, width)} {rng.randint(0, height)} {x2} {y2}" '
            f'stroke="#be7c28" stroke-opacity="0.35" fill="none" stroke-width="1.5"/>'
        )
    for _ in range(28):
        noise.append(
            f'<circle cx="{rng.randint(0, width)}" cy="{rng.randint(0, height)}" '
            f'r="{rng.choice((1, 1, 2))}" fill="#062b4f" fill-opacity="0.2"/>'
        )

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" role="img" aria-label="Verification challenge">'
        f'<rect width="{width}" height="{height}" rx="10" fill="#f5f2ed"/>'
        f'{"".join(noise)}{"".join(chars)}</svg>'
    )


def build_challenge() -> Challenge:
    """Half arithmetic, half character transcription — bots must handle both."""
    token = secrets.token_urlsafe(24)
    seed = secrets.randbelow(2**31)
    rng = random.Random(seed)

    if rng.random() < 0.5:
        a, b = rng.randint(2, 12), rng.randint(1, 9)
        op = rng.choice(_OPERATIONS)
        if op == "+":
            answer = a + b
        elif op == "-":
            a, b = max(a, b), min(a, b)
            answer = a - b
        else:
            b = rng.randint(2, 5)
            answer = a * b
        prompt = "Solve the sum shown"
        display = f"{a} {op} {b}"
        return Challenge(token, str(answer), prompt, _render_svg(display, seed))

    word = rng.choice(_WORDS)
    display = "".join(c.upper() if rng.random() < 0.5 else c for c in word)
    return Challenge(token, word.lower(), "Type the word shown", _render_svg(display, seed))


def normalise(answer: str) -> str:
    return answer.strip().lower().replace(" ", "")
