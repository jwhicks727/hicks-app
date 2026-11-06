// ============================================
// leafOrigins.js -- where each autumn leaf sits in her painting
// ============================================
// Written by scripts/leaf-origins.py, which fits each leaf on a sheet back into the
// painting it was cut from (they are her own pixels, so each fits exactly). For each
// painting: `scale`, sheet pixels to painting pixels, and `origins`, each leaf's centre
// as fractions of the painting, in the order of its sheet's boxes. Measured, never guessed.

export const LEAF_ORIGINS = {
  'autumn-pond': { scale: 0.887, origins: [[0.4041, 0.2078], [0.0988, 0.27], [0.3903, 0.2825], [0.3337, 0.1775], [0.0847, 0.2188], [0.45, 0.1372], [0.4034, 0.3097], [0.1053, 0.0684], [0.2053, 0.1241], [0.0722, 0.1109], [0.1369, 0.0553], [0.8041, 0.2956], [0.13, 0.205], [0.1897, 0.0475], [0.3528, 0.1516], [0.6162, 0.1253], [0.32, 0.2316], [0.2269, 0.3831], [0.0816, 0.3784], [0.1016, 0.185]] },
  'autumn-stream': { scale: 0.884, origins: [[0.7769, 0.8241], [0.7188, 0.8653], [0.8275, 0.9059], [0.7603, 0.9359], [0.0847, 0.8272], [0.2247, 0.78], [0.9075, 0.7903], [0.8906, 0.7203], [0.8575, 0.9366], [0.8131, 0.7516], [0.1069, 0.2053], [0.9525, 0.8847], [0.2106, 0.8334], [0.6759, 0.765], [0.8294, 0.7191], [0.1141, 0.8959], [0.9022, 0.9269], [0.1619, 0.7744], [0.2028, 0.8722], [0.9503, 0.9437]] },
}
