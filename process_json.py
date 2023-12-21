import json
import random
import string

def generate_random_string(length=16):
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for _ in range(length))

input_file = 'C:/HIDEAWAY-NEVERDELETE/database-tables/latest-exported.json'
output_file = 'C:/HIDEAWAY-NEVERDELETE/database-tables/players.json'

with open(input_file, 'r') as f:
    data = json.load(f)

output_data = []

for entry in data:
    entry['_id'] = generate_random_string()
    output_data.append(json.dumps(entry, separators=(',', ':')))

with open(output_file, 'w') as f:
    f.write('\n'.join(output_data))
