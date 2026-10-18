"""Exercise the actual Rust migration CLI; literal source fixtures pin money and source identity."""
import json,subprocess,unittest,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
BIN=ROOT/'target/debug/migration-assistant'
def normalize(source,kind,value):
    if not BIN.exists():
        return subprocess.CompletedProcess([],127,'','Rust migration application has not been built')
    return subprocess.run([str(BIN),'normalize',source,kind,'EUR','de-DE','source-a'],input=json.dumps(value)+'\n',capture_output=True,text=True,env={**os.environ,'MIGRATION_LANGUAGE_MAP':json.dumps({'1':'de-DE'}),'MIGRATION_SOURCE_TIMEZONE':'Europe/Berlin'})
class Normalization(unittest.TestCase):
    def read(self,source,kind,value):
        r=normalize(source,kind,value);self.assertEqual(r.returncode,0,r.stderr)
        return [json.loads(s) for s in r.stdout.splitlines()]
    def test_shopify_variant_money_and_parent(self):
        rows=self.read('shopify','products',{'id':'gid://shopify/Product/1','title':'Keramik','body_html':'<p>Handarbeit</p>','variants':[{'id':11,'title':'Blau','sku':'MUG-B','price':'19.90','inventory_quantity':8}]})
        self.assertEqual(len(rows),1);r=rows[0]
        self.assertEqual(r['data']['price'],{'currency':'EUR','scale':2,'minor':1990})
        self.assertIsNone(r['data']['parentSourceId']);self.assertEqual(r['data']['sourceProductId'],'gid://shopify/Product/1')
        self.assertEqual(r['sourceId'],'11');self.assertEqual(r['data']['stock'],8)
    def test_multiple_variants_have_native_group_and_options(self):
        rows=self.read('shopify','products',{'id':'source-parent','title':'Mug','variants':[{'id':'blue','title':'Blue','sku':'BLUE','price':'10.00','selectedOptions':[{'name':'Colour','value':'Blue'}]},{'id':'red','title':'Red','sku':'RED','price':'11.00','selectedOptions':[{'name':'Colour','value':'Red'}]}]})
        self.assertEqual(len(rows),3);self.assertEqual(rows[0]['sourceId'],'group:source-parent')
        self.assertEqual(rows[1]['data']['parentSourceId'],rows[0]['sourceId']);self.assertEqual(rows[2]['data']['options'],{'Colour':'Red'})
    def test_category_ids_and_localized_slug_preserve_references(self):
        r=self.read('woocommerce','products',{'id':1,'name':'Cup','price':'1.00','categories':[{'id':8,'name':'Cups'}]})[0]
        self.assertEqual(r['data']['categorySourceIds'],['8'])
        c=self.read('prestashop','categories',{'id':8,'name':[{'id':'1','value':'Tassen'}],'link_rewrite':[{'id':'1','value':'tassen'}],'id_parent':'0'})[0]
        self.assertEqual(c['data']['slug'],{'de-DE':'tassen'});self.assertIsNone(c['data']['parentSourceId'])
    def test_woocommerce_decimal_and_variation_identity(self):
        r=self.read('woocommerce','products',{'id':9,'name':'Tasse','type':'simple','sku':'CUP','regular_price':'21.95','stock_quantity':3})[0]
        self.assertEqual(r['data']['price']['minor'],2195);self.assertEqual(r['sourceId'],'9')
    def test_prestashop_multilingual_source(self):
        r=self.read('prestashop','products',{'id':7,'name':[{'id':'1','value':'Tasse'}],'price':'12.50','reference':'PRE-7','id_category_default':'3'})[0]
        self.assertEqual(r['data']['name']['de-DE'],'Tasse');self.assertEqual(r['data']['price']['minor'],1250)
    def test_magento_custom_attributes(self):
        r=self.read('magento2','products',{'id':3,'sku':'MAG-3','name':'Cup','price':15.25,'type_id':'simple','custom_attributes':[{'attribute_code':'description','value':'Ceramic'}]})[0]
        self.assertEqual(r['data']['price']['minor'],1525);self.assertEqual(r['data']['description']['de-DE'],'Ceramic')
    def test_shopware5_main_detail(self):
        r=self.read('shopware5','products',{'id':4,'name':'Becher','mainDetail':{'id':44,'number':'SW-4','inStock':5,'prices':[{'price':'29.90'}]}})[0]
        self.assertEqual(r['sourceId'],'44');self.assertEqual(r['data']['price']['minor'],2990)
    def test_exact_large_historical_amount_and_no_claimed_payment(self):
        r=self.read('shopify','orders',{'id':17,'name':'OLD-17','currency':'EUR','total_price':'90071992547409.91','financial_status':'paid','line_items':[{'id':1,'title':'Historical','quantity':1,'price':'90071992547409.91'}]})[0]
        self.assertEqual(r['data']['total']['minor'],9007199254740991)
        self.assertEqual(r['data']['totalDisplay'],'90071992547409.91')
        self.assertEqual(r['data']['sourcePaymentStatus'],'paid');self.assertNotIn('providerConfirmed',r['data'])
    def test_historical_totals_from_every_adapter(self):
        cases=[('woocommerce',{'id':1,'total':'19.90'}),('prestashop',{'id':2,'total_paid':'19.90'}),('magento2',{'entity_id':3,'grand_total':'19.90'}),('shopware5',{'id':4,'invoiceAmount':'19.90'})]
        for source,raw in cases:
            with self.subTest(source=source):self.assertEqual(self.read(source,'orders',raw)[0]['data']['total']['minor'],1990)
    def test_review_and_customer_import_never_invent_authority(self):
        review=self.read('woocommerce','reviews',{'id':7,'product_id':9,'review':'Original','rating':5,'verified':True})[0]
        self.assertTrue(review['data']['sourceVerified']);self.assertFalse(review['data']['verifiedPurchase'])
        customer=self.read('shopify','customers',{'id':8,'email':'synthetic@example.test','first_name':'A'})[0]
        self.assertIsNone(customer['data']['consentEvidence']);self.assertFalse(customer['data']['credentialMigrated'])
    def test_source_pages_and_coupon_rules_are_retained_for_review(self):
        page=self.read('woocommerce','pages',{'id':1,'title':{'rendered':'About'},'content':{'rendered':'<p>Original</p>'},'slug':'about'})[0]
        self.assertEqual(page['data']['title']['de-DE'],'About')
        coupon=self.read('woocommerce','coupons',{'id':2,'code':'WELCOME','amount':'10','discount_type':'percent','usage_limit':5})[0]
        self.assertEqual(coupon['data']['sourceRules']['usage_limit'],5);self.assertFalse(coupon['data']['activationReviewed'])
    def test_pages_become_native_editable_rich_documents(self):
        row=self.read('woocommerce','pages',{'id':1,'title':{'rendered':'About'},'content':{'rendered':'<h2>Our workshop</h2><p>Made with <strong>care</strong>.</p>'},'slug':'about'})[0]
        target=row['data']['destination'];self.assertEqual(target['app'],'site_builder');self.assertEqual(target['fields']['status'],'draft')
        doc=target['fields']['content']['blocks'][0]['rich']['de-DE'][0]['doc'];self.assertEqual(doc['content'][0]['type'],'heading')
        self.assertEqual(doc['content'][1]['content'][1]['marks'],[{'type':'bold'}])
        unsafe=normalize('woocommerce','pages',{'id':2,'title':'Unsafe','content':{'rendered':'<script>steal()</script>'},'slug':'unsafe'})
        self.assertNotEqual(unsafe.returncode,0);self.assertIn('unsupported script',unsafe.stderr)
    def test_page_inline_spacing_and_list_structure_are_preserved(self):
        row=self.read('woocommerce','pages',{'id':1,'title':'About','content':{'rendered':'<p><strong>Made</strong> <em>carefully</em></p><ol start="3"><li>First</li></ol>'},'slug':'about'})[0]
        nodes=row['data']['destination']['fields']['content']['blocks'][0]['rich']['de-DE'][0]['doc']['content']
        self.assertEqual(''.join(n.get('text','') for n in nodes[0]['content']),'Made carefully')
        self.assertEqual(nodes[1]['attrs']['start'],3);self.assertEqual(nodes[1]['content'][0]['content'][0]['type'],'paragraph')
    def test_customer_address_and_order_lines_are_native_canonical(self):
        c=self.read('woocommerce','customers',{'id':7,'email':'fixture@example.test','first_name':'Ada','last_name':'Test','billing':{'address_1':'Test Street 1','postcode':'10115','city':'Berlin','country':'DE'}})[0]
        self.assertEqual(c['data']['billingAddress'].get('street'),'Test Street 1')
        o=self.read('shopware5','orders',{'id':1,'invoiceAmount':'12.50','details':[{'id':8,'articleName':'Historical mug','quantity':2,'price':'6.25'}]})[0]
        self.assertEqual(o['data']['lines'][0]['label'],'Historical mug')
        self.assertEqual(o['data']['lines'][0]['unitPrice']['minor'],625)
    def test_woo_gmt_timestamp_is_explicit(self):
        row=self.read('woocommerce','orders',{'id':7,'total':'9.90','date_created_gmt':'2020-01-02T03:04:05'})[0]
        self.assertEqual(row['data']['createdAt'],'2020-01-02T03:04:05Z')
    def test_magento_utc_and_presta_confirmed_timezone(self):
        m=self.read('magento2','orders',{'id':1,'grand_total':'1.00','created_at':'2020-01-02 03:04:05'})[0]
        self.assertEqual(m['data']['createdAt'],'2020-01-02T03:04:05Z')
        p=self.read('prestashop','orders',{'id':2,'total_paid':'1.00','date_add':'2020-01-02 03:04:05'})[0]
        self.assertEqual(p['data']['createdAt'],'2020-01-02T02:04:05Z')
        ambiguous=normalize('prestashop','orders',{'id':3,'total_paid':'1.00','date_add':'2020-10-25 02:30:00'})
        self.assertNotEqual(ambiguous.returncode,0);self.assertIn('ambiguous',ambiguous.stderr)
    def test_precise_fraction_is_not_silently_rounded(self):
        r=normalize('woocommerce','products',{'id':9,'name':'Cup','price':'1.999'})
        self.assertNotEqual(r.returncode,0);self.assertIn('precision',r.stderr)
    def test_source_scope_is_part_of_identity(self):
        r=self.read('woocommerce','products',{'id':9,'name':'Cup','price':'1.00'})[0]
        self.assertEqual(r['sourceShop'],'source-a');self.assertEqual(r['source'],'woocommerce');self.assertEqual(r['version'],1)
    def test_unsupported_domain_fails_explicitly(self):
        r=normalize('shopify','arbitrary_sql',{'id':1});self.assertNotEqual(r.returncode,0)
        self.assertIn('unsupported',r.stderr)
if __name__=='__main__':unittest.main()
