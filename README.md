# Location Science · Lab 02 — Analyzing Violent Crime

This is a public, student-facing ArcGIS Pro lab manual using the **historical Chicago Broken Bottles case-study dataset**, ending at the quarter-mile selection of public high schools. It contains Location Science instructional text and **20 original schematic SVG illustrations**. The SVG maps are conceptual teaching graphics, not actual ArcGIS outputs.

## Real data source

Students need **two real-data ZIP files** before beginning:

1. **ArcGIS Pro case-study package (ZIP)** — original project and supporting GIS layers, hosted by Esri/ArcGIS Online:

https://www.arcgis.com/sharing/rest/content/items/653c890653244e72b122d8bbbf2c0f11/data

2. **Chicago neighborhood Shapefile (ZIP)** — used for the robbery-by-neighborhood exercise, hosted by the City of Chicago:

https://data.cityofchicago.org/download/9wp7-iasj/application/zip

The external downloads are maintained by their original providers. They are not included or redistributed in this repository. The website contains **no simulated crime data**. Students unpack `BrokenBottlesPkg.ppkx` and use the prepared `Violent Crime 2014`, `Liquor Vendors`, `Analysis Boundary`, and `Public High Schools` layers, plus `Poverty.lpk` and `Unemployment.lpk` where included. Extract the City ZIP and add its `.shp` file in Step 1.2. [Chicago neighborhood dataset information](https://data.cityofchicago.org/Facilities-Geographic-Boundaries/Boundaries-Neighborhoods/bbvz-uum9).

The manual follows these nine chapters:

1. Explore the project, crime categories, and neighborhood robberies.
2. Create violent-crime hot spots with Optimized Hot Spot Analysis.
3. Map liquor-vendor hot spots on the same grid.
4. Map poverty hot spots from historical ACS values.
5. Select `Gi_Bin = 3` and intersect all three hot spot layers.
6. Create a four-week netCDF space-time cube and run Emerging Hot Spot Analysis.
7. Map 2015 unemployment-rate hot spots.
8. Intersect selected crime trend patterns with unemployment hot spots.
9. Select public high schools within **0.25 miles** of that intersection.

Every chapter contains collapsible substeps, exact ArcGIS parameter tables, why-it-matters notes, SVG visual guides, a check, and a student answer field. Progress and answers stay in the student's browser; the page can export an answer text file and print the expanded instructions.

## Publish to GitHub Pages

Existing user repository: `nirav11/lab2_SpatialAnalysis`

Expected public URL after enabling Pages:

https://nirav11.github.io/lab2_SpatialAnalysis/

1. Extract the provided GitHub Pages ZIP on your computer.
2. Upload **the ZIP's contents**, not the ZIP, to the repository root on `main`. In particular, `index.html` must be at the repository root and the `figures/` directory must stay intact.
3. The repository root should contain:

   ```text
   index.html
   lab.css
   lab.js
   .nojekyll
   README.md
   figures/
     open_project.svg
     explore_join.svg
     crime_parameters.svg
     ... and 17 more SVG figures
   ```

4. Go to **GitHub → Repository Settings → Pages** and choose **Deploy from a branch**, `main`, `/(root)`. Save.
5. Visit the public URL and expand a chapter; ensure its illustration appears. In **Download the two datasets for class**, check both buttons independently—they point to Esri and the City of Chicago.

If you uploaded a previous version of this lab, remove old `manual.css`, `manual.js`, and `practice/` files when convenient so students cannot access outdated simulated assets. Do not delete unrelated files without checking.

## Notes for instructors

- The source case study mixes 2014 crime, 2009–2013 poverty, and 2015 unemployment measurements. It teaches methods; it is not evidence for contemporary policy.
- ArcGIS Pro version changes can affect exact geoprocessing field names and optimized cell sizes. The manual directs students to record actual messages and use equivalent fields.
- The `figures/` directory contains hand-crafted schematic guides, **not** software captures or computed results.
- No analytics, login, backend, tracking, data entry submissions, or grading are implemented.
