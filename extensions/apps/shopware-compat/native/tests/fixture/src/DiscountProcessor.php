<?php
namespace NativeDiscountReference;
use Shopware\Core\Checkout\Cart\Cart;
use Shopware\Core\Checkout\Cart\CartBehavior;
use Shopware\Core\Checkout\Cart\CartProcessorInterface;
use Shopware\Core\Checkout\Cart\LineItem\CartDataCollection;
use Shopware\Core\Checkout\Cart\LineItem\LineItem;
use Shopware\Core\Checkout\Cart\Price\PercentagePriceCalculator;
use Shopware\Core\Checkout\Cart\Price\Struct\PercentagePriceDefinition;
use Shopware\Core\System\SalesChannel\SalesChannelContext;
final class DiscountProcessor implements CartProcessorInterface
{
    public function __construct(private readonly PercentagePriceCalculator $calculator) {}
    public function process(CartDataCollection $data, Cart $original, Cart $toCalculate, SalesChannelContext $context, CartBehavior $behavior): void
    {
        $definition = new PercentagePriceDefinition(-10);
        $discount = new LineItem('native-discount-reference', 'native_discount', null, 1);
        $discount->setLabel('Native discount reference');
        $discount->setGood(false);
        $discount->setStackable(false);
        $discount->setRemovable(false);
        $discount->setPriceDefinition($definition);
        $discount->setPrice($this->calculator->calculate($definition->getPercentage(), $toCalculate->getLineItems()->getPrices(), $context));
        $toCalculate->add($discount);
    }
}
