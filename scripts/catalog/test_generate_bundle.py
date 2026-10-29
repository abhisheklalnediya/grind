import json
import tempfile
import unittest
from pathlib import Path

from generate_bundle import generate


class BundleRegistryTest(unittest.TestCase):
    def test_generates_static_registry_and_rejects_missing_image(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'images/flat').mkdir(parents=True)
            archive = {'source': 'repdb-free', 'schema_version': 3,
                       'exercises': [{'id': 'curl', 'images': {'flat': ['start', 'peak']}}]}
            (root / 'free.en.json').write_text(json.dumps(archive))
            image = root / 'images/flat/curl-start.webp'
            with self.assertRaises(ValueError):
                generate(root)
            image.write_bytes(b'RIFF1234WEBP')
            self.assertEqual(generate(root), 1)
            self.assertIn('require("./images/flat/curl-start.webp")', (root / 'image-registry.js').read_text())
            archive['exercises'].append(archive['exercises'][0])
            (root / 'free.en.json').write_text(json.dumps(archive))
            with self.assertRaises(ValueError):
                generate(root)


if __name__ == '__main__':
    unittest.main()
