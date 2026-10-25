<?php declare(strict_types=1);
namespace VeyndoCompatibilityFixture;
use Doctrine\DBAL\Connection;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
final class Subscriber implements EventSubscriberInterface
{
    public function __construct(private readonly Connection $connection) {}
    public static function getSubscribedEvents(): array { return ['kernel.response' => 'respond']; }
    public function respond(ResponseEvent $event): void
    {
        $event->getResponse()->headers->set('X-Veyndo-Compatibility-Fixture', 'original-plugin-active');
        $event->getResponse()->headers->set('X-Veyndo-Compatibility-Migration', (string) $this->connection->fetchOne('SELECT value FROM veyndo_compat_fixture WHERE id=1'));
    }
}
