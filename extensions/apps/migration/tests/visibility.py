"""Original source publication status must never silently become an active target product."""
import json,unittest
from normalization import normalize
class Visibility(unittest.TestCase):
    def read(self,source,data):
        result=normalize(source,'products',data)
        self.assertEqual(result.returncode,0,result.stderr)
        return [json.loads(line) for line in result.stdout.splitlines()]
    def test_shopify_drafts_and_unpublished_online_products_remain_hidden(self):
        base={'id':7,'title':'Original','variants':[{'id':71,'price':'19.90'}]}
        for data,visible in (({'status':'ACTIVE','onlineStoreUrl':'https://source.example/products/original'},True),({'status':'DRAFT'},False),({'status':'ARCHIVED'},False),({'status':'ACTIVE','onlineStoreUrl':None},False)):
            self.assertIs(self.read('shopify',{**base,**data})[0]['data']['catalogActive'],visible)
        for value in ('UNLISTED','BROKEN',[],True):
            self.assertNotEqual(normalize('shopify','products',{**base,'status':value}).returncode,0)
    def test_numeric_source_flags_are_explicit_and_invalid_values_stop(self):
        cases=[('prestashop',{'id':1,'name':'Cup','price':'19.90'},'active',(0,'0',False),(1,'1',True)),
               ('magento2',{'id':2,'sku':'MAG-2','name':'Cup','price':'19.90','type_id':'simple'},'status',(2,'2'),(1,'1')),
               ('shopware5',{'id':3,'name':'Cup','mainDetail':{'id':31,'prices':[{'price':'19.90'}]}},'active',(False,),(True,))]
        for source,base,key,hidden,visible in cases:
            for value in hidden+visible:
                with self.subTest(source=source,value=value):self.assertIs(self.read(source,{**base,key:value})[0]['data']['catalogActive'],value in visible)
            for value in ('yes',{},[],None if source=='shopware5' else 99):
                with self.subTest(source=source,invalid=value):
                    if value is None:continue
                    self.assertNotEqual(normalize(source,'products',{**base,key:value}).returncode,0)
    def test_shopware_inactive_parent_dominates_active_variants(self):
        base={'id':3,'name':'Cup','active':False,'details':[{'id':31,'active':True,'prices':[{'price':'19.90'}]},{'id':32,'active':False,'prices':[{'price':'21.90'}]}]}
        self.assertTrue(all(row['data']['catalogActive'] is False for row in self.read('shopware5',base)))
    def test_separate_source_search_catalogue_visibility_requires_mapping(self):
        for source,base,key,values in [('prestashop',{'id':1,'name':'Cup','price':'19.90','active':'1'},'visibility',('none','catalog','search')),('magento2',{'id':2,'sku':'MAG-2','name':'Cup','price':'19.90','status':1,'type_id':'simple'},'visibility',(1,2,3))]:
            for value in values:
                with self.subTest(source=source,value=value):self.assertNotEqual(normalize(source,'products',{**base,key:value}).returncode,0)
if __name__=='__main__':unittest.main()
