# Location Science — Lab 02: Crime Patterns

An original, static teaching website for an introductory spatial-analysis class. It includes an interactive browser demonstration, ArcGIS Pro instructions, student questions, and downloadable synthetic practice points. All interactive activity stays in the student's browser.

## Publish at `https://nirav11.github.io/`

This address works only if you own the **`nirav11` GitHub user or organization account**.

1. In that GitHub account, create a **public** repository named `nirav11.github.io` if it does not already exist.
2. Put the contents of this directory directly at the repository root: `index.html`, `app.js`, `style.css`, `typography.css`, `course-layout.css`, and `.nojekyll` (the `README.md` file may also be included).
3. Commit and push the files to the `main` branch.
4. Open the repository's **Settings → Pages**. Under *Build and deployment*, select **Deploy from a branch**, then select `main` and `/(root)`. Save.
5. Wait for GitHub Pages to publish, then visit `https://nirav11.github.io/`.

If you want this lab to be one page in an existing GitHub Pages website instead, publish it in a separate repository such as `location-science-lab` and its normal URL will be `https://nirav11.github.io/location-science-lab/`.

The app is a static site; no dependencies, builds, external fonts, login system, or API keys are needed. It does link out to the official City of Chicago open-data portal for the real incident dataset.

## Data and integrity

The built-in browser demo uses simulated incident locations and an illustrative, unadjusted local clustering statistic. The formal Getis-Ord Gi* exercise is performed in ArcGIS Pro. This site does not contain or redistribute the reference instructor's GitHub repository or images.
