"""Protocol-faithful local CRM source responses; synthetic records exercise separate reference resources."""
from urllib.parse import urlsplit,parse_qs
import base64
def crm_get(url,auth,workspace):
    path=urlsplit(url).path
    presta='Basic '+base64.b64encode(b'provider-source-synthetic:').decode()
    shopware='Basic '+base64.b64encode(b'fixture:provider-source-synthetic').decode()
    address={'firstname':'Ada','lastname':'Original','street':['Original Street 1'],'postcode':'10115','city':'Berlin','country_id':'DE'}
    if auth==presta:
        if path=='/api/customers':return {'customers':[{'id':'202','email':'presta-'+workspace+'@example.test','firstname':'Ada','lastname':'Original'}]}
        if path=='/api/orders':return {'orders':[{'id':'203','reference':'PRESTA-203','id_customer':'202','id_address_invoice':'5010','id_address_delivery':'5011','id_currency':'1','total_paid':'12.50','date_add':'2020-01-02T03:04:05Z','associations':{'order_rows':[{'id':'2031','product_name':'Original Presta item','product_quantity':'2','unit_price_tax_incl':'6.25','product_id':'501'}]}}]}
        if path=='/api/addresses':
            assert parse_qs(urlsplit(url).query)['filter[id_customer]']==['[202]']
            return {'addresses':[{'id':str(i),'id_customer':'202','id_country':'1','id_state':'0','firstname':'Ada','lastname':'Original','address1':street,'postcode':'10115','city':'Berlin'} for i,street in [(5010,'Original Street 1'),(5011,'Delivery Street 2'),(5012,'Warehouse Street 3')]]}
        if path.startswith('/api/addresses/'):
            key=int(path.rsplit('/',1)[1]);assert key in (5010,5011)
            return {'address':{'id':str(key),'id_customer':'202','id_country':'1','id_state':'0','firstname':'Ada','lastname':'Original','address1':'Original Street 1' if key==5010 else 'Delivery Street 2','postcode':'10115','city':'Berlin'}}
        if path=='/api/countries/1':return {'country':{'id':'1','iso_code':'DE'}}
        if path=='/api/currencies/1':return {'currency':{'id':'1','iso_code':'EUR','precision':'2'}}
    if auth=='Bearer provider-source-synthetic':
        if path=='/rest/V1/customers/search':return {'items':[{'id':602,'email':'magento-'+workspace+'@example.test','firstname':'Ada','lastname':'Original','default_billing':'6010','default_shipping':'6011','addresses':[{**address,'id':6010},{**address,'id':6011,'street':['Delivery Street 2']},{**address,'id':6012,'street':['Warehouse Street 3']}]}],'total_count':1}
        if path=='/rest/V1/orders':return {'items':[{'entity_id':603,'increment_id':'MAGENTO-603','grand_total':'12.50','order_currency_code':'EUR','created_at':'2020-01-02 03:04:05','billing_address':address,'extension_attributes':{'shipping_assignments':[{'shipping':{'address':{**address,'street':['Delivery Street 2']}}}]},'items':[{'item_id':6031,'name':'Original Magento item','qty_ordered':2,'price':'6.25','product_id':601}]}],'total_count':1}
    if auth==shopware:
        if path=='/api/customers':return {'data':[{'id':702,'email':'shopware-'+workspace+'@example.test'}],'total':1}
        sw_address={'firstName':'Ada','lastName':'Original','street':'Original Street 1','zipCode':'10115','city':'Berlin','country':{'iso':'DE'}}
        if path=='/api/customers/702':return {'data':{'id':702,'email':'shopware-'+workspace+'@example.test','firstname':'Ada','lastname':'Original','defaultBillingAddress':sw_address,'defaultShippingAddress':{**sw_address,'street':'Delivery Street 2'},'addresses':[sw_address,{**sw_address,'street':'Delivery Street 2'},{**sw_address,'street':'Warehouse Street 3'}]},'success':True}
        if path=='/api/orders':return {'data':[{'id':703,'number':'SHOPWARE-703','invoiceAmount':'12.50'}],'total':1}
        if path=='/api/orders/703':return {'data':{'id':703,'number':'SHOPWARE-703','invoiceAmount':'12.50','currency':'EUR','orderTime':'2020-01-02T03:04:05Z','billing':sw_address,'shipping':{**sw_address,'street':'Delivery Street 2'},'details':[{'id':7031,'articleName':'Original Shopware item','quantity':2,'price':'6.25','articleId':701}]},'success':True}
    return None

def crm_shopify(query,workspace):
    address={'id':'gid://shopify/MailingAddress/8010','firstName':'Ada','lastName':'Original','address1':'Original Street 1','zip':'10115','city':'Berlin','countryCodeV2':'DE'}
    if 'customers(first:' in query:
        assert 'defaultEmailAddress{emailAddress}' in query and 'addressesV2(first:50)' in query
        return {'data':{'customers':{'nodes':[{'id':'gid://shopify/Customer/802','defaultEmailAddress':{'emailAddress':'shopify-'+workspace+'@example.test'},'first_name':'Ada','last_name':'Original','default_address':address,'addressesV2':{'nodes':[address,{**address,'id':'gid://shopify/MailingAddress/8012','address1':'Warehouse Street 3'}],'pageInfo':{'hasNextPage':False}}}],'pageInfo':{'hasNextPage':False}}}}
    if 'orders(first:' in query:
        assert 'billingAddress{' in query and 'shippingAddress{' in query
        return {'data':{'currentAppInstallation':{'accessScopes':[{'handle':'read_all_orders'},{'handle':'read_orders'}]},'orders':{'nodes':[{'id':'gid://shopify/Order/803','name':'SHOPIFY-803','currency':'EUR','totalPriceSet':{'shopMoney':{'amount':'12.50','currencyCode':'EUR'}},'created_at':'2020-01-02T03:04:05Z','billingAddress':address,'shippingAddress':{**address,'address1':'Delivery Street 2'},'lineItems':{'nodes':[{'id':'gid://shopify/LineItem/8031','title':'Original Shopify item','quantity':2,'originalUnitPriceSet':{'shopMoney':{'amount':'6.25','currencyCode':'EUR'}},'variant':{'id':'gid://shopify/ProductVariant/811'}}],'pageInfo':{'hasNextPage':False}}}],'pageInfo':{'hasNextPage':False}}}}
    return None
