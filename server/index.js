import byteSize from 'byte-size';
import csvtojson from 'csvtojson';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { Readable, Transform, Writable } from 'node:stream';
import { TransformStream } from 'node:stream/web';

const PORT = 3000;
// curl -N http://localhost:3000
const server = createServer(async (req, res) => {
	const headers = {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET'
	};

	if (req.method === 'OPTIONS') {
		res.writeHead(204, headers);
		res.end();
		return;
	}

	const filename = './data/animeflv.csv';
	const { size } = await stat(filename);

	console.log('processing', byteSize(size).toString());

	try {
		res.writeHead(200, headers);

		await Readable.toWeb(createReadStream(filename))
			.pipeThrough(Transform.toWeb(csvtojson()))
			.pipeThrough(
				new TransformStream({
					async transform(chunk, controller) {
						// chunk is a buffer
						const data = JSON.parse(Buffer.from(chunk));
						const mappedData = JSON.stringify({
							title: data.titulo,
							description: data.description,
							url: data.url_anime
						});

						// just to make sure that our data has as separator
						controller.enqueue(mappedData.concat('\n'));
					}
				})
			)
			.pipeTo(Writable.toWeb(res));
	} catch (error) {
		console.error(error);
	}
});

server.listen(PORT).on('listening', () => console.log(`Server is listening on port ${PORT}`));
