"""Original addresses and historical line evidence must survive actual Rust normalization without invented identity."""
import json,unittest
from normalization import normalize

class CRM(unittest.TestCase):
    def read(self,source,kind,row):
        result=normalize(source,kind,row)
        self.assertEqual(result.returncode,0,result.stderr)
        return json.loads(result.stdout)['data']
    def test_shopware_order_address_aliases(self):
        address={'firstName':'Ada','lastName':'Original','street':'Quellweg 1','zipCode':'10115','city':'Berlin','country':{'iso':'DE'},'additionalAddressLine1':'Hinterhaus'}
        row=self.read('shopware5','orders',{'id':1,'invoiceAmount':'12.50','billing':address,'shipping':{**address,'street':'Lieferweg 2'}})
        self.assertEqual(row['billingAddress']['country'],'DE')
        self.assertEqual(row['billingAddress']['postalCode'],'10115')
        self.assertEqual(row['billingAddress']['additionalAddressLine1'],'Hinterhaus')
        self.assertEqual(row['shippingAddress']['street'],'Lieferweg 2')
    def test_magento_default_addresses_remain_distinct(self):
        base={'firstname':'Ada','lastname':'Original','street':['Quellweg 1','Etage 2'],'postcode':'10115','city':'Berlin','country_id':'DE'}
        row=self.read('magento2','customers',{'id':2,'email':'synthetic@example.test','firstname':'Ada','lastname':'Original','default_billing':'10','default_shipping':'11','addresses':[{**base,'id':10},{**base,'id':11,'street':['Lieferweg 2']}]})
        self.assertEqual(row['billingAddress']['country'],'DE')
        self.assertEqual(row['billingAddress']['street'],'Quellweg 1 Etage 2')
        self.assertEqual(row['shippingAddress']['street'],'Lieferweg 2')
    def test_woo_shipping_address_is_not_dropped(self):
        row=self.read('woocommerce','customers',{'id':3,'email':'synthetic@example.test','first_name':'Ada','last_name':'Original','billing':{},'shipping':{'address_1':'Lieferweg 2','postcode':'10115','city':'Berlin','country':'DE'}})
        self.assertIsNone(row['billingAddress'])
        self.assertEqual(row['shippingAddress']['street'],'Lieferweg 2')
    def test_magento_order_shipping_assignment_is_preserved(self):
        shipping={'firstname':'Ada','lastname':'Original','street':['Lieferweg 2'],'postcode':'10115','city':'Berlin','country_id':'DE'}
        row=self.read('magento2','orders',{'entity_id':4,'grand_total':'12.50','extension_attributes':{'shipping_assignments':[{'shipping':{'address':shipping}}]}})
        self.assertEqual(row['shippingAddress']['street'],'Lieferweg 2')
        failed=normalize('magento2','orders',{'entity_id':4,'grand_total':'12.50','extension_attributes':{'shipping_assignments':[{'shipping':{'address':shipping}},{'shipping':{'address':shipping}}]}})
        self.assertNotEqual(failed.returncode,0)
    def test_incomplete_nonempty_address_is_not_silently_lost(self):
        for address in ({'city':'Berlin','country':'DE'},{'street':'Quellweg 1','country':{'name':'Germany'}},{'street':'Quellweg 1','country':'Germany'}):
            with self.subTest(address=address):
                result=normalize('woocommerce','customers',{'id':3,'email':'synthetic@example.test','billing':address})
                self.assertNotEqual(result.returncode,0,result.stdout)
    def test_additional_addresses_are_preserved_and_missing_default_does_not_pick_another(self):
        base={'firstname':'Ada','lastname':'Original','street':['Quellweg 1'],'postcode':'10115','city':'Berlin','country_id':'DE'}
        row={'id':2,'email':'synthetic@example.test','default_billing':'10','default_shipping':'11','addresses':[{**base,'id':10},{**base,'id':11,'street':['Lieferweg 2']},{**base,'id':12,'street':['Lagerweg 3']}]}
        data=self.read('magento2','customers',row)
        self.assertEqual([a['street'] for a in data['additionalAddresses']],['Lagerweg 3'])
        row['default_billing']='999';row['addresses'][0]['default_billing']=True
        self.assertNotEqual(normalize('magento2','customers',row).returncode,0)
    def test_historical_item_currency_mismatch_is_not_relabelled(self):
        row={'id':7,'total_price':'12.50','line_items':[{'id':8,'title':'Original','quantity':1,'originalUnitPriceSet':{'shopMoney':{'amount':'12.50','currencyCode':'USD'}}}]}
        self.assertNotEqual(normalize('shopify','orders',row).returncode,0)
    def test_source_regions_survive_native_country_mapping(self):
        for source,geography in [('shopify',{'countryCodeV2':'US','provinceCode':'CA'}),('prestashop',{'country_code':'US','provinceCode':'CA'}),('magento2',{'country_id':'US','region':{'region_code':'CA'}}),('shopware5',{'country':{'iso':'US'},'state':{'shortCode':'CA'}}),('woocommerce',{'country':'US','state':'CA'})]:
            with self.subTest(source=source):
                address={'street':'Original Street 1','city':'Test City','postcode':'90210',**geography}
                data=self.read(source,'customers',{'id':9,'email':'synthetic@example.test','billing':address})
                self.assertEqual(data['billingAddress']['countryStateId'],'US-CA')
                history=self.read(source,'orders',{'id':9,'total_price':'12.50','billing':address})
                self.assertEqual(history['billingAddress']['countryStateId'],'US-CA')
        wrong=normalize('woocommerce','customers',{'id':9,'billing':{'street':'Original Street 1','country':'US','state':'DE-BE'}})
        self.assertNotEqual(wrong.returncode,0)

if __name__=='__main__':unittest.main()
