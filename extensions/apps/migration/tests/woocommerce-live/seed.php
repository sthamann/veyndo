<?php
WC_Install::install();
$term=get_term_by('slug','ceramics','product_cat'); $cat=$term ? (int)$term->term_id : (int)wp_insert_term('Ceramics','product_cat',['slug'=>'ceramics'])['term_id'];
foreach(['ATELIER-CUP','STUDIO-BOWL','BOWL-BLUE','BOWL-RED'] as $sku){$old=wc_get_product_id_by_sku($sku);if($old){$prod=wc_get_product($old);$prod->delete(true);}}
$png=base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS5cAAAAASUVORK5CYII=');
$up=wp_upload_bits('atelier-cup.png',null,$png);
$img=wp_insert_attachment(['post_mime_type'=>'image/png','post_title'=>'Atelier cup','post_status'=>'inherit'],$up['file']);
require_once ABSPATH.'wp-admin/includes/image.php'; wp_update_attachment_metadata($img,wp_generate_attachment_metadata($img,$up['file']));
$p=new WC_Product_Simple(); $p->set_name('Atelier ceramic cup'); $p->set_sku('ATELIER-CUP'); $p->set_regular_price('19.90');$p->set_description('<p>Made in our <strong>workshop</strong>.</p>');$p->set_manage_stock(true);$p->set_stock_quantity(12);$p->set_category_ids([$cat]);$p->set_image_id($img);$p->set_status('publish');$simple=$p->save();
$v=new WC_Product_Variable();$v->set_name('Studio glazed bowl');$v->set_sku('STUDIO-BOWL');$v->set_category_ids([$cat]);$v->set_image_id($img);$v->set_status('publish');
$attr=new WC_Product_Attribute();$attr->set_name('Colour');$attr->set_options(['Blue','Red']);$attr->set_variation(true);$attr->set_visible(true);$v->set_attributes([$attr]);$parent=$v->save();
$children=[];
foreach(['Blue'=>'29.00','Red'=>'31.00'] as $colour=>$price){$x=new WC_Product_Variation();$x->set_parent_id($parent);$x->set_attributes(['colour'=>$colour]);$x->set_regular_price($price);$x->set_sku('BOWL-'.strtoupper($colour));$x->set_manage_stock(true);$x->set_stock_quantity(7);$x->set_status('publish');$x->set_image_id($img);$children[]=$x->save();}
WC_Product_Variable::sync($parent);
$customer=new WC_Customer();$customer->set_username('atelier_buyer');$customer->set_email('atelier-buyer@example.test');$customer->set_first_name('Ada');$customer->set_last_name('Example');$customer->set_password(wp_generate_password(40));
$addr=['first_name'=>'Ada','last_name'=>'Example','address_1'=>'Test Street 1','city'=>'Berlin','postcode'=>'10115','country'=>'DE','email'=>'atelier-buyer@example.test'];foreach($addr as $field=>$value){$method='set_billing_'.$field;$customer->$method($value);if($field!=='email'){$method='set_shipping_'.$field;$customer->$method($value);}}$cid=$customer->save();
$o=wc_create_order(['customer_id'=>$cid]);$o->add_product(wc_get_product($simple),2);$o->set_address($addr,'billing');$o->set_address($addr,'shipping');$o->set_currency('EUR');$shipping=new WC_Order_Item_Shipping();$shipping->set_method_title('Original delivery');$shipping->set_method_id('flat_rate');$shipping->set_total('4.90');$o->add_item($shipping);$o->calculate_totals();$o->set_status('completed');$o->set_date_created('2021-01-02T10:00:00Z');$oid=$o->save();
$page=wp_insert_post(['post_type'=>'page','post_title'=>'Our workshop','post_name'=>'our-workshop','post_content'=>'<h2>Our workshop</h2><p>Objects made with care.</p>','post_status'=>'publish']);
$review=wp_insert_comment(['comment_post_ID'=>$simple,'comment_author'=>'Original buyer','comment_author_email'=>'original-reviewer@example.test','comment_content'=>'Beautiful ceramic cup.','comment_type'=>'review','comment_approved'=>1,'comment_date_gmt'=>'2021-01-03 10:00:00','comment_date'=>'2021-01-03 10:00:00']);update_comment_meta($review,'rating',5);update_comment_meta($review,'verified',1);
$coupon=new WC_Coupon();$coupon->set_code('ATELIER10');$coupon->set_discount_type('percent');$coupon->set_amount('10');$coupon->set_usage_limit(5);$coupon->set_usage_count(2);$coupon_id=$coupon->save();
global $wpdb;$key='ck_'.bin2hex(random_bytes(20));$secret='cs_'.bin2hex(random_bytes(20));
$wpdb->insert($wpdb->prefix.'woocommerce_api_keys',['user_id'=>1,'description'=>'Disposable read-only migration acceptance','permissions'=>'read','consumer_key'=>wc_api_hash($key),'consumer_secret'=>$secret,'truncated_key'=>substr($key,-7)]);
foreach(get_posts(['post_type'=>'page','post_status'=>'publish','numberposts'=>-1]) as $entry){if($entry->ID!==$page)wp_update_post(['ID'=>$entry->ID,'post_status'=>'draft']);}
for($i=1;$i<=20;$i++){$extra=new WC_Product_Simple();$extra->set_name('Atelier sample '.$i);$extra->set_sku('RESTOCK-'.$i);$extra->set_regular_price('12.50');$extra->set_status('publish');$extra->set_manage_stock(true);$extra->set_stock_quantity(3);$extra->save();}
echo wp_json_encode(['username'=>$key,'token'=>$secret,'simple'=>$simple,'parent'=>$parent,'variants'=>$children,'image'=>$img,'category'=>$cat,'customer'=>$cid,'order'=>$oid,'total'=>$o->get_total(),'page'=>$page,'review'=>$review,'coupon'=>$coupon_id,'wordpress'=>get_bloginfo('version'),'woocommerce'=>WC_VERSION]);
