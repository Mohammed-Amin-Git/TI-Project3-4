import requests
import json
import unittest

API_HOST = "http://145.24.223.56:8080"

class testAPIAccountinfo(unittest.TestCase):
    def test_correct_info(self):
        url = API_HOST + "/api/accountinfo"
        params = {
            "target": "NL45WILB0987654321"
        }

        data = {
            "pincode": "1234",
            "uid": "5D39A4A4"
        }

        response = requests.post(url, json = data, params=params)
        response_json = response.json()
        status_code = response.status_code

        self.assertEqual(200, status_code)

        self.assertIsInstance(response_json['firstname'], str)
        self.assertIsInstance(response_json['lastname'], str)
        self.assertIsInstance(response_json['balance'], int)
    
    def test_incorrect_request(self):
        url = API_HOST + "/api/accountinfo"
        
        # Test incorrect iban format
        params = {
            "target": "***",
        }

        data = {
            "pincode": "1234",
            "uid": "5D39A4A4"
        }

        response = requests.post(url, json = data, params=params)
        status_code = response.status_code
        self.assertEqual(400, status_code)

        # Test incorrect pincode format
        params = {
            "target": "NL45WILB0987654321"
        }

        data = {
            "pincode": "***",
            "uid": "5D39A4A4"
        }
        response = requests.post(url, json = data, params=params)
        status_code = response.status_code
        self.assertEqual(400, status_code)

        # Test incorrect uid format
        params = {
            "target": "NL45WILB0987654321"
        }

        data = {
            "pincode": "1234",
            "uid": "***"
        }
        response = requests.post(url, json = data, params=params)
        status_code = response.status_code
        self.assertEqual(400, status_code)

        # Test no given data test
        response = requests.post(url)
        status_code = response.status_code
        self.assertEqual(400, status_code)

    def test_incorrect_pincode(self):
        url = API_HOST + "/api/accountinfo"

        params = {
            "target": "NL45WILB0987654321",
        }

        data = {
            "pincode": "0000",
            "uid": "5D39A4A4"
        }

        response = requests.post(url, json = data, params = params)
        response_json = response.json()
        status_code = response.status_code

        self.assertEqual(401, status_code)
        self.assertIsInstance(response_json["attempts_remaining"], int)

        # Reset attempts remaining
        params = {
            "target": "NL45WILB0987654321"
        }

        data = {
            "pincode": "1234",
            "uid": "5D39A4A4"
        }

        response = requests.post(url, json = data, params = params)
    
    def test_user_not_found(self):
        # test accountinfo unknown iban
        url = API_HOST + "/api/accountinfo"
        params = {
            "target": "NL05WILB1010101010"
        }

        data = {
            "pincode": "1234",
            "uid": "5D39A4A4"
        }

        response = requests.post(url, json = data, params = params)
        status_code = response.status_code

        self.assertEqual(status_code, 404)

        # test withdraw unknown iban
        url = API_HOST + "/api/withdraw"
        params = {
            "target": "NL05WILB1010101010"
        }

        data = {
            "pincode": "1234",
            "uid": "5D39A4A4",
            "amount": 5
        }
        response = requests.post(url, json = data, params = params)
        status_code = response.status_code

        self.assertEqual(status_code, 404)
    

        # test accountinfo unknown uid
        url = API_HOST + "/api/accountinfo"

        params = {
            "target": "NL45WILB0123456789"
        }

        data = {
            "pincode": "1234",
            "uid": "AABBCCDD"
        }

        response = requests.post(url, json = data, params = params)
        status_code = response.status_code

        self.assertEqual(status_code, 404)

        # test withdraw unknown uid
        url = API_HOST + "/api/withdraw"

        params = {
            "target": "NL45WILB0123456789"
        }

        data = {
            "pincode": "1234",
            "uid": "AABBCCDD",
            "amount": 5
        }
        
        response = requests.post(url, json = data, params = params)
        status_code = response.status_code

        self.assertEqual(status_code, 404)

    def test_card_blocked(self):
        # test /api/accountinfo
        url = API_HOST + "/api/accountinfo"
        params = {
            "target": "NL05WILB1010101010"
        }

        data = {
            "pincode": "1234",
            "uid": "DDCCBBAA"
        }

        response = requests.post(url, json = data, params = params)
        status_code = response.status_code

        self.assertEqual(status_code, 403)

        # test /api/withdraw
        url = API_HOST + "/api/withdraw"
        params = {
            "target": "NL05WILB1010101010"
        }

        data = {
            "pincode": "1234",
            "uid": "DDCCBBAA",
            "amount": 5
        }

        response = requests.post(url, json = data, params = params)
        status_code = response.status_code

        self.assertEqual(status_code, 403)
    
    def test_withdraw(self):
        # Low balance test
        url = API_HOST + "/api/withdraw"
        params = {
            "target": "NL50WILB5555555555"
        }

        data = {
            "pincode": "1234",
            "uid": "AABBCCDD",
            "amount": 100
        }

        response = requests.post(url, json = data, params = params)
        status_code = response.status_code

        self.assertEqual(status_code, 412)

        params = {
            "target": "NL70WILB7777777777"
        }

        data = {
            "pincode": "1234",
            "uid": "11223344",
            "amount": 5
        }
        response = requests.post(url, json = data, params = params)
        status_code = response.status_code

        self.assertEqual(status_code, 200)






if __name__== '__main__':
    unittest.main()