import axios from 'axios';

const API_KEY = 'tlk_03X7JZ31FDWJZG24W4D6M3R1DKA6';
const BASE_URL = 'https://api.twelvelabs.io/v1.1';

async function checkIndexes() {
  try {
    const response = await axios.get(`${BASE_URL}/indexes`, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log('Indexes found:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error fetching indexes:', error.response?.data || error.message);
  }
}

checkIndexes();
