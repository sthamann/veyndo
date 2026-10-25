<?php declare(strict_types=1);
// Original Shopware lifecycle code, intentionally outside the Veyndo Rust core.
namespace VeyndoCompatibilityFixture;
use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Plugin;
use Shopware\Core\Framework\Plugin\Context\InstallContext;
use Shopware\Core\Framework\Plugin\Context\UninstallContext;
use Shopware\Core\System\SystemConfig\SystemConfigService;
final class VeyndoCompatibilityFixture extends Plugin
{
    public function install(InstallContext $context): void
    {
        $this->container->get(SystemConfigService::class)->set('VeyndoCompatibilityFixture.config.installed', true);
    }
    public function uninstall(UninstallContext $context): void
    {
        if (!$context->keepUserData()) {
            $this->container->get(Connection::class)->executeStatement('DROP TABLE IF EXISTS veyndo_compat_fixture');
        }
    }
}
