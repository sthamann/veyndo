<?php
// Disposable loopback fixture models the public media side of a TLS-terminated shop.
add_filter('wp_get_attachment_url', function($url){return str_replace('https://127.0.0.1:18887/', 'http://127.0.0.1:18887/', $url);});
