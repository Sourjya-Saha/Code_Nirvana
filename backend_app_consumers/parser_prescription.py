import re
from parser_generic import MedicalDocParser

class PrescriptionParser(MedicalDocParser):
    def __init__(self, text):
        super().__init__(text)

    def parse(self):
        return {
            'patient_name': self.get_field('patient_name'),
            'patient_address': self.get_field('patient_address'),
            'medicines': self.get_field('medicines'),
            'directions': self.get_field('directions'),
            'refills': self.get_field('refills')
        }

    def get_field(self, field_name):
        pattern_dict = {
            'patient_name': {'pattern': r'Name:(.*?)Date', 'flags': 0},
            'patient_address': {'pattern': r'Address:(.*)', 'flags': 0},
            'medicines': {'pattern': r'Address[^\n]*(.*?)Directions', 'flags': re.DOTALL},
            'directions': {'pattern': r'Directions:(.*?)Refill', 'flags': re.DOTALL},
            'refills': {'pattern': r'Refill:(.*?)times', 'flags': 0},
        }

        def medicines_directions_extractor(text):
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            # Return the list or single item if only one
            return lines if len(lines) > 1 else lines[0] if lines else None

        pattern_object = pattern_dict.get(field_name)
        if pattern_object:
            matches = re.findall(pattern_object['pattern'], self.text, flags=pattern_object['flags'])
            if matches:
                match_text = matches[0].strip()
                if field_name in ['medicines', 'directions']:
                    return medicines_directions_extractor(match_text)
                return match_text
        return None  # Return None if no matches found

if __name__ == '__main__':
    document_text = '''
Dr John Smith, M.D
2 Non-Important Street,
New York, Phone (000)-111-2222
Name: Marta Sharapova Date: 5/11/2022
Address: 9 tennis court, new Russia, DC

Prednisone 20 mg
Lialda 2.4 gram
Directions:
Prednisone, Taper 5 mg every 3 days,
Finish in 2.5 weeks -
Lialda - take 2 pill everyday for 1 month
Refill: 3 times
'''
    pp = PrescriptionParser(document_text)
    print(pp.parse())
