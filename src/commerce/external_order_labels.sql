-- Bounded imported-order names: locale first, then child before parent.
-- Keep SQL blank-name filtering and the caller's final Rust trim fallback.
SELECT DISTINCT ON (product.id) product.id, translation.name
FROM products product
JOIN product_translations translation
  ON translation.tenant = product.tenant
 AND translation.product_id IN (product.id, product.parent_id)
JOIN languages lang ON lang.id = translation.language_id
WHERE product.tenant = $1 AND product.id = ANY($2)
  AND lang.locale = ANY($3)
  AND translation.name IS NOT NULL AND btrim(translation.name) <> ''
ORDER BY product.id, array_position($3, lang.locale),
         CASE WHEN translation.product_id = product.id THEN 0 ELSE 1 END
