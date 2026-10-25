# RuralNet — data directory

Imported and generated public datasets live here. **Nothing in `data/` is
committed to git** (see the workspace `.gitignore`): datasets are downloaded
once by the operator and generated locally.

```
data/
├── import/        ← place raw downloads here (untracked)
│   ├── nga_admpop_adm2_2022.csv      (HDX COD-PS LGA population)
│   ├── nga_admin_boundaries.geojson  (HDX COD-AB, unzipped)
│   └── fibre_routes.geojson          (any trusted line export)
└── generated/     ← written by the import scripts (untracked)
    ├── population-lga.json
    ├── coverage.json
    ├── fibre.geojson
    └── boundaries/<lga>.geojson
```

The import scripts create files in `data/generated/` and the live providers
read them at research time. When a file is absent, the relevant section
reports **“Data unavailable”** — RuralNet never substitutes invented values.

**Sources for public downloads:**

- LGA population (COD-PS): https://data.humdata.org/dataset/cod-ps-nga
- LGA boundaries (COD-AB): https://data.humdata.org/dataset/cod-ab-nga
- Cell towers (optional): https://opencellid.org/ (CC BY-SA snapshot)

See the README “Importing datasets” section for exact commands.