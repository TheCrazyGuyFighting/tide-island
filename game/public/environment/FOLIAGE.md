# Coastal foliage texture

Asset: `coastal-leaf-atlas.png`, 1254 × 1254 RGBA. Generated with the built-in image-generation tool on 2026-09-18 for this game. This is an AI-generated photographic-style texture, not a photograph or botanical scan. Original alpha transparency is preserved; the four quadrants are mapped onto curved branch cards.

## Final generation prompt

Use case: photorealistic-natural. Asset type: transparent RGBA foliage texture atlas for a realistic real-time island game, not an illustration or concept scene. Produce ONE square 1024 x 1024 image divided into four equal invisible quadrants, each with a separate botanically believable slender leafy twig, isolated on genuinely transparent background. Each quadrant contains a naturally branching coastal evergreen twig with 18-26 small elliptical/lanceolate leaves, thin brown stems, visible delicate leaf veins, subtle mottling, slightly imperfect curled edges. Arrange twig base near bottom center of each quadrant, twig grows upward and fans diagonally. Four different branch shapes with irregular gaps between leaves, all entirely within their own quadrant with 24px transparent padding at borders. Natural medium olive/forest green leaves, a few paler young leaves, realistic restrained saturation. Photorealistic scan-like albedo, even diffuse neutral overcast light, crisp focus everywhere, NO strong baked highlights or cast shadows. Show subtle underside variation and fine organic surface texture. Absolutely NO soil, pot, scene, gridlines, labels, text, watermark, checkerboard pattern, solid background or cartoon shading. Actual alpha transparency in all empty space, including gaps between leaves. This will be mapped onto small gently curved 3D branch cards in tree crowns.

## Integration

The island and rainforest share the atlas. Canopy cards are curved, rotated in three dimensions, individually wind-weighted, alpha-tested, and cast alpha-cutout shadows with the same wind deformation. Palm pinnae and grass are separate curved meshes with fine fibre shading. Grass uses three seeded prototypes, varied patch density, slope-aligned roots, and shorter blades.
