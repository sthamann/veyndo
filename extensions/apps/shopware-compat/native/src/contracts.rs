//! Versioned Shopware symbols that have an explicit bounded native equivalent.
pub(crate) const PLUGIN: &str = "Shopware\\Core\\Framework\\Plugin";
pub(crate) const PROCESSOR: &str = "Shopware\\Core\\Checkout\\Cart\\CartProcessorInterface";
pub(crate) const CALCULATOR: &str =
    "Shopware\\Core\\Checkout\\Cart\\Price\\PercentagePriceCalculator";
pub(crate) const DEFINITION: &str =
    "Shopware\\Core\\Checkout\\Cart\\Price\\Struct\\PercentagePriceDefinition";
pub(crate) const LINE: &str = "Shopware\\Core\\Checkout\\Cart\\LineItem\\LineItem";
pub(crate) const PARAMETERS: [&str; 5] = [
    "Shopware\\Core\\Checkout\\Cart\\LineItem\\CartDataCollection",
    "Shopware\\Core\\Checkout\\Cart\\Cart",
    "Shopware\\Core\\Checkout\\Cart\\Cart",
    "Shopware\\Core\\System\\SalesChannel\\SalesChannelContext",
    "Shopware\\Core\\Checkout\\Cart\\CartBehavior",
];
