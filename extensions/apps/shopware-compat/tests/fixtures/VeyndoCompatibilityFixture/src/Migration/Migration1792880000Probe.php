<?php declare(strict_types=1);
namespace VeyndoCompatibilityFixture\Migration;
use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Migration\MigrationStep;
final class Migration1792880000Probe extends MigrationStep
{
    public function getCreationTimestamp(): int { return 1792880000; }
    public function update(Connection $connection): void
    {
        $connection->executeStatement('CREATE TABLE IF NOT EXISTS veyndo_compat_fixture (id INT PRIMARY KEY, value VARCHAR(100) NOT NULL)');
        $connection->executeStatement("INSERT INTO veyndo_compat_fixture (id, value) VALUES (1, 'installed') ON DUPLICATE KEY UPDATE value='installed'");
    }
    public function updateDestructive(Connection $connection): void {}
}
