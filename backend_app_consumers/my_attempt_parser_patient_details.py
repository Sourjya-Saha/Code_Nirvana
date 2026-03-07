import re
from parser_generic import MedicalDocParser


class PatientDetailsParser(MedicalDocParser):
    def __init__(self, text):
        MedicalDocParser.__init__(self, text)

    def parse(self):
        return {
            'patient_name': self.get_specified_field('patient_name'),
            'patient_phone_number': self.get_specified_field('patient_phone_number'),
            'hepataitis_b_vactination_status': self.get_specified_field('hepataitis_b_vactination_status'),
            'medical_problems': self.get_specified_field('medical_problems')
        }

    def get_specified_field(self, field_name):
        pattern_dict = {
            'patient_name': {
                'pattern': r'Birth Date\s+([A-Za-z\s]+?)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)',
                'flags': 0},
            'patient_phone_number': {
                'pattern': r'(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+\s+\d{4}\s+\((\d{3})\)\s+(\d{3}-\d{4})',
                'flags': 0},
            'hepataitis_b_vactination_status': {'pattern': r'Have you had the Hepatitis B vaccination\?\s*(Yes|No)',
                                                'flags': 0},
            'medical_problems': {
                'pattern': r'List any Medical Problems \(asthma, seizures, headaches(?:\}|\)):\s*(.*)',
                'flags': 0}
        }

        pattern_object = pattern_dict.get(field_name)
        if pattern_object:
            matches = re.findall(pattern_object['pattern'], self.text, flags=pattern_object['flags'])
            if len(matches) > 0:
                if field_name == 'patient_phone_number':
                    return f'({matches[0][0]}) {matches[0][1]}'
                return matches[0].strip()
text_1='''17/12/2020

Patient Medical Record . : :

Patient Information

Birth Date
Kathy Crawford May 6 1972
(737) 988-0851 Weight:
9264 Ash Dr 95
New York City, 10005 a
United States Height:
190
In Case of Emergency
en oe
Simeone Crawford 9266 Ash Dr
New York City, New York, 10005
Home phone United States
(990) 375-4621
Work phone
Genera! Medical History
I a
Chicken Pox (Varicella): Measies:
IMMUNE IMMUNE

Have you had the Hepatitis B vaccination?

No

List any Medical Problems (asthma, seizures, headaches):

Migraine'''

text_2='''17/12/2020

Patient Medical Record

Patient Information Birth Date

Jerry Lucas May 2 1998

(279) 920-8204 , Weight:

4218 Wheeler Ridge Dr 57

Buffalo, New York, 14201 Heicht:

United States eight
170

In Case of Emergency
ee

Joe Lucas 4218 Wheeler Ridge Dr
Buffalo, New York, 14201
Home phone | United States
Work phone

General Medical History

Chicken Pox (Varicelia): Measles:

IMMUNE NOT IMMUNE

Have you had the Hepatitis B vaccination?

Yes

List any Medical Problems (asthma, seizures, headaches):
N/A'''

text_3='''
    Patient Medical Record . : :

    Patient Information


    Birth Date
    Kathy Crawford May 6 1972
    (737) 988-0851 Weight:
    9264 Ash Dr 95
    New York City, 10005 a
    United States Height:
    190
    In Case of Emergency
    ee oe
    Simeone Crawford 9266 Ash Dr
    New York City, New York, 10005
    Home phone United States
    (990) 375-4621
    Work phone
    Genera! Medical History
    I i
    Chicken Pox (Varicella): Measies:
    IMMUNE IMMUNE

    Have you had the Hepatitis B vaccination?

    No

    List any Medical Problems (asthma, seizures, headaches):

    Migraine'''
if __name__ == '__main__':
    pp = PatientDetailsParser(text_3)
    print(pp.parse())