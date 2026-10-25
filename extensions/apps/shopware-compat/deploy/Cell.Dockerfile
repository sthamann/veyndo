# Original Shopware runtime. Plugin PHP and migrations never enter the Veyndo core.
FROM composer:2 AS composer
FROM php:8.4-apache
RUN apt-get update && apt-get install -y --no-install-recommends git unzip libicu-dev libzip-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j2 pdo_mysql intl zip gd opcache bcmath \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer /usr/bin/composer /usr/local/bin/composer
WORKDIR /var/www/html
RUN chown root:root . && git clone https://github.com/shopware/production.git . \
    && git checkout 0242545ecdb2364cdb01aa41340c3063282de79e && rm -rf .git
COPY extensions/apps/shopware-compat/deploy/composer.lock ./composer.lock
RUN COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --no-scripts --prefer-dist --no-interaction \
    && COMPOSER_ALLOW_SUPERUSER=1 composer recipes:install --force --yes --no-interaction --no-scripts \
    && mkdir -p var files custom/apps custom/plugins public/media public/thumbnail public/theme public/bundles public/sitemap public/export \
    && cp public/.htaccess.dist var/public.htaccess && rm -f public/.htaccess && ln -s ../var/public.htaccess public/.htaccess \
    && ln -s var/install.lock install.lock \
    && chown -R www-data:www-data /var/www/html
RUN a2enmod rewrite headers \
    && sed -i 's@/var/run/apache2@/tmp/apache2@g; s@/var/lock/apache2@/tmp/apache2@g' /etc/apache2/envvars \
    && sed -i 's/Listen 80/Listen 8080/' /etc/apache2/ports.conf \
    && sed -i 's/:80>/:8080>/; s@DocumentRoot /var/www/html@DocumentRoot /var/www/html/public@' /etc/apache2/sites-available/000-default.conf \
    && printf 'ServerName localhost\n<Directory /var/www/html/public>\nAllowOverride All\nRequire all granted\n</Directory>\n' > /etc/apache2/conf-available/veyndo-cell.conf \
    && a2enconf veyndo-cell \
    && printf 'variables_order=EGPCS\nexpose_php=Off\nmemory_limit=512M\n' > /usr/local/etc/php/conf.d/cell.ini
ENV APP_ENV=prod APP_DEBUG=0 APACHE_RUN_DIR=/tmp/apache2 APACHE_LOCK_DIR=/tmp/apache2
USER www-data
EXPOSE 8080
CMD ["apache2-foreground"]
