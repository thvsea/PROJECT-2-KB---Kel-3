// ---------------------------------------------------------------------------------
// Convolutional Neural Network pake Tensorflow
// CNN -> pemetakan gambar2, jdi hrs ngecek keseluruhan gambar 
// Tensor => btk matematika (bs nyimpen campuran skalar, vektor, matrix)
// ---------------------------------------------------------------------------------

var CNN = function(main){ //nyiapin template convolutional layernya
	this.main = main;//me-refer ke Main State
	
	this.NUM_CLASSES = App.DATASETS.length; //tiap class = jumlah dataset (jenis2 gmbr)
	
	this.IMAGE_SIZE = 784; //ukuran image di dataset (28x28)
	
	this.NUM_TRAIN_IMAGES = 400; //jumlah TRAINING di 1 dataset
	this.NUM_TEST_IMAGES = 100; //jumlah TEST di 1 dataset
	
	this.TRAIN_ITERATIONS = 50; //jumlah loop TRAINING
	this.TRAIN_BATCH_SIZE = 100; //jum data yg diambil utk skali train (1 loop)
	
	this.TEST_FREQUENCY = 2; //frekuensi TESTING (jumlah TRAINING dalam tiap TEST) - buat grafik
	this.TEST_BATCH_SIZE = 50; //jumlah image yg diTEST per loop
	
	this.trainIteration = 0; //inisialisasi jum loop TRAINING 
	this.arrAkurasi = []; //data akurasi pas training
	
	const TOTAL_TRAIN_IMAGES = this.NUM_CLASSES * this.NUM_TRAIN_IMAGES; //total jum img yg ditrain, semua class 
	const TOTAL_TEST_IMAGES = this.NUM_CLASSES * this.NUM_TEST_IMAGES; //total jum img yg ditrain, semua class 
	
	//inisialisasi array 
	this.aTrainImages = new Float32Array(TOTAL_TRAIN_IMAGES * this.IMAGE_SIZE); //nyimpen tiap pixel 
	this.aTrainClasses = new Uint8Array(TOTAL_TRAIN_IMAGES);
	
	//membuat array & menyimpan idx shuffle TRAINING Data
	this.aTrainIndices = tf.util.createShuffledIndices(TOTAL_TRAIN_IMAGES);//menyimpan idx hasil shuffle dri 0-(jum image yg ditrain-1)
	
	this.trainElement = -1;//inisialisasi aTrainIndices[] 
					
	//inisialisasi array 
	this.aTestImages = new Float32Array(TOTAL_TEST_IMAGES * this.IMAGE_SIZE); //nyimpen tiap pixel 
	this.aTestClasses = new Uint8Array(TOTAL_TEST_IMAGES);
	
	//membuat array & menyimpan idx shuffle TESTING Data
	this.aTestIndices = tf.util.createShuffledIndices(TOTAL_TEST_IMAGES);//menyimpan hasil shuffle
	
	this.testElement = -1;//inisialisasi aTestIndices[] 

	//membuat CNN model dgn tipe sequential 
	//spy tensor bs diterusin scr berurutan antar layer ke berikutnya
	this.model = tf.sequential(); //library inisialisasi model 

	//nambahin convolutional layer
	this.model.add(tf.layers.conv2d({
		inputShape: [28, 28, 1],
		kernelSize: 5, //ukuran filter 5x5 
		filters: 8, //jum kombinasi gambar
		strides: 1, //pergerakan filter
		activation: 'relu', //aktivasi yg paling umum 
		kernelInitializer: 'varianceScaling' 
	}));
	
	//nambahin max pooling layer
	this.model.add(tf.layers.maxPooling2d({ 
		poolSize: [2, 2],  //ambil 2x2 kotak 
		strides: [2, 2] //lompat perpindahan 
	}));
	
	//nambahin convolutional layer 2
	this.model.add(tf.layers.conv2d({
		kernelSize: 5, 
		filters: 16, //jum kombinasi 
		strides: 1,
		activation: 'relu', //aktivasi yg paling umum (- jdi 0)
		kernelInitializer: 'varianceScaling'
	}));
	
	//nambahin max pooling layer 2
	this.model.add(tf.layers.maxPooling2d({ //maxPooling yg diambil data yg berwarna, min ambil data putih 
		poolSize: [2, 2], 
		strides: [2, 2]
	}));
	
	//nambahin flatten layer utk ngeratain output dri layer ke vector
	this.model.add(tf.layers.flatten()); //pecahin dri arr	2D jdi 1D
	
	//nambahin dense layer (fully connected) utk melakukan final classification 
	this.model.add(tf.layers.dense({ //perhitungan probabilitas 
		units: this.NUM_CLASSES, 
		kernelInitializer: 'varianceScaling', 
		activation: 'softmax' //hasil output total psti 1 . biasany utk klasifikasi probabilitas bbrp image
	}));
	
	//library utk compile model 
	this.model.compile({
		optimizer: tf.train.sgd(0.15), //di-optimisasi dgn stochastic gradient descent 
		loss: 'categoricalCrossentropy', //hilangin data yg beleset 
		metrics: ['accuracy'], //evaluation metric - bener/ga nya, dri bnyk data, yg bener brp % 
	});
};

// ===================================================
// SPLIT SEMUA DATASET KE DATA (TRAINING & TEST) 
// ===================================================
/**
* @param {Uint8Array} imagesBuffer - array yg nyimpen data biner semua gambar
* @param {integer} dataset - jum dataset
*/

CNN.prototype.splitDataset = function(imagesBuffer, dataset){ //dataset ke-..  (0-fish),(1-car)
//TRAIN 
	//potong dataset utk training 
	var trainBuffer = new Float32Array(imagesBuffer.slice(0, this.IMAGE_SIZE * this.NUM_TRAIN_IMAGES)); //slice dari 0 - jum train 
	trainBuffer = trainBuffer.map(function (cv){return cv/255.0}); //normalisasi pixel jdi 0-1 

	var start = dataset * this.NUM_TRAIN_IMAGES; 
	this.aTrainImages.set(trainBuffer, start * this.IMAGE_SIZE); //nambahin gmbr dri idx 'start' train ke array class 
		//targetArray.set(sourceArray, startIndex)
	this.aTrainClasses.fill(dataset, start, start + this.NUM_TRAIN_IMAGES); 
		//array.fill(value, startIndex, endIndex)
//TEST	
	//potong dataset utk testing  
	var testBuffer = new Float32Array(imagesBuffer.slice(this.IMAGE_SIZE * this.NUM_TRAIN_IMAGES)); //slice dari idx (jum train)
	testBuffer = testBuffer.map(function (cv){return cv/255.0}); //normalisasi pixel jdi 0-1 
	
	start = dataset * this.NUM_TEST_IMAGES;
	this.aTestImages.set(testBuffer, start * this.IMAGE_SIZE); //nambahin daftar2 gmbr test 
	this.aTestClasses.fill(dataset, start, start + this.NUM_TEST_IMAGES); //nambahin daftar2 class
};

// ============================
// TRAIN MODEL - melakukan train pd model/object cnn
// ============================
CNN.prototype.train = async function(){
	this.isTrainCompleted = false; //buat nandadin udah selesai/blm 
						
	for (let i = 0; i < this.TRAIN_ITERATIONS; i++){
		this.trainIteration++; //jumlah training
		this.main.ui.showStatusBar("Training.. - iteration " + this.trainIteration + " ");
		
		//mengambil TRAINING BATCH selanjutnya
		let trainBatch = this.nextTrainBatch(this.TRAIN_BATCH_SIZE);
		
		//mbuat batch TEST & validasi (img,label)
		let testBatch;
		let validationSet;
				
		if (i % this.TEST_FREQUENCY === 0){ //dalam tiap kelipatan 2, lakukan TESTING
			testBatch = this.nextTestBatch(this.TEST_BATCH_SIZE);//mengambil batch berikutnya 
			validationSet = [testBatch.images, testBatch.labels];//utk menampilkan image & label 
		}
		
		//library buat TRAIN modelnya 
		const training = await this.model.fit(
			trainBatch.images,
			trainBatch.labels, //label output (0,1,0..)
			{
				batchSize: this.TRAIN_BATCH_SIZE, //bnyk data yg ditrain dlm 1 epoch 
				validationData: validationSet, 
				epochs: 1 //putaran utk bljr
			} 
		);
		
		if (testBatch != null) { //kalo garis ada lanjutannya / bukan pertama kalinya jalan, sambungin
			var maxAccuLength = this.main.ui.bmpAccuChart.width; //ngambil panjang terakhir garis Accuracy Chart
			if (this.arrAkurasi.length * this.TEST_FREQUENCY > maxAccuLength) this.arrAkurasi.shift();
			//kalo panjang garis skrg melebihi > pnjg garis sblmnya, 
			//geser grafik & potong garis sblmnya 
			this.arrAkurasi.push(1 - Math.min(1, training.history.acc[0])); 
			//akurasi = 1 - (nilai terkecil dri hasil training terbaru, max 1)
			this.main.ui.plotChart(this.main.ui.bmpAccuChart, this.arrAkurasi, this.TEST_FREQUENCY); //menggambar grafik
			
		}

		await tf.nextFrame();//mencegah ui buat jalan & unable button2nya
	}
	
	this.isTrainCompleted = true;
};

// ================================================
// PREDIKSI SAMPLE GAMBAR DARI DATA TESTING
// ================================================
CNN.prototype.predictSamples = async function(){
	this.isSamplesPredicted = false;
	const samplesBatch = this.nextTestBatch(App.NUM_SAMPLES);
		//library PREDIKSI
		const output = this.model.predict(samplesBatch.images); //nyimpen output 
		
		const aClassifications = Array.from(samplesBatch.labels.argMax(1).dataSync()); //klasifikasi 
		const aPredictions = Array.from(output.argMax(1).dataSync()); //hasil tebakan 
		
		this.main.ui.showSamplePredictions(aClassifications, aPredictions);

	this.isSamplesPredicted = true;
};
	
// ================================================
// PREDIKSI HASIL INPUT GAMBAR DOODLE
// ================================================
/**
* @param {Float32Array} aNormalizedPixels - nyimpen array hasil normalisasi pixel
*/
CNN.prototype.predictDoodle = async function(aNormalizedPixels){		
	const input = tf.tensor2d(aNormalizedPixels, [1, this.IMAGE_SIZE]); //tf.tensor (value, btk data, tipe data)
	tf.tidy(() => { //library mengelola tensor
		const output = this.model.predict( //prediksi data
			input.reshape([1, 28, 28, 1]) 
			//reshape ke btk model input (jum batch, h,w, channel/rgb/greyscale)
		);
		const aPrediction = Array.from(output.argMax(1).dataSync());
		//mengambil idx nilai max dlm baris 1  | mereturn data tensor ke array biasa 
		this.main.ui.showDoodlePrediction(aPrediction);
	});
};

// ======================================================
// MENGAMBIL BATCH (image & class) TRAINING
//  mereturn batch TRAINING
// ======================================================
/**
*
* @param {integer} batchSize - jum gambar dlm sekali TRAINING 
*/
CNN.prototype.nextTrainBatch = function(batchSize){
	return this.fetchBatch( //manggil function fetchBatch 
	//(batchSize, aImages, aClasses, getIndex)
		batchSize, this.aTrainImages, this.aTrainClasses, 
		() => { //ambil index yg diperluin 
			this.trainElement = (this.trainElement + 1) % this.aTrainIndices.length;
			return this.aTrainIndices[this.trainElement];
		}
	);
};

// ================================================
// MENGAMBIL BATCH (image & class) TEST
//  mereturn batch TEST
// ================================================
/**
* @param {integer} batchSize - jumlah gambar yg diinclude di test batch
*/
CNN.prototype.nextTestBatch = function(batchSize){
	return this.fetchBatch( //manggil function fetchBatch 
	//(batchSize, aImages, aClasses, getIndex)
		batchSize, this.aTestImages, this.aTestClasses, 
		() => { //ambil index yg diperluin 
			this.testElement = (this.testElement + 1) % this.aTestIndices.length; 
			return this.aTestIndices[this.testElement];
		}
	);
};

// ================================================
// MENGAMBIL BATCH (image & class) 
//  mereturn library image & label gambarnya 
// ================================================
/**
* @param {integer} batchSize - jum gambar dlm sekali TRAINING 
* @param {Float32Array} aImages 
* @param {Uint8Array} aClasses 
* @param {integer} getIndex - function utk idx gambar yg mau diambil 
*/
CNN.prototype.fetchBatch = function(batchSize, aImages, aClasses, getIndex){
	//buat batch array
	const batchImages = new Float32Array(batchSize * this.IMAGE_SIZE);
	const batchLabels = new Uint8Array(batchSize * this.NUM_CLASSES);

	for (let i = 0; i < batchSize; i++){
		const idx = getIndex(); //ambil idx gambar 
		const image = aImages.slice(idx * this.IMAGE_SIZE, (idx + 1) * this.IMAGE_SIZE); //fetch gambar
		//mskin gambar ke batch 
		batchImages.set(image, i * this.IMAGE_SIZE); //targetArray.set(sourceArray, startIndex)

		const class_num = aClasses[idx]; //ngambil class number gmbr tsb
		
		//generate gambar & memberi label pake --> "one hot encoding method":
		//definisiin array dmn semua elemen 0, kecuali 1 element gambar yg bener
		//kyk candle =  [0,0,1]  , fish = [0,1,0]
		const label = new Uint8Array(this.NUM_CLASSES);
		label[class_num] = 1; 
		
		//masukin label ke batchLabel 
		batchLabels.set(label, i * this.NUM_CLASSES); //targetArray.set(sourceArray, startIndex)
	}

	//convert batch of images ke tensor 
	const images_temp = tf.tensor2d(batchImages, [batchSize, this.IMAGE_SIZE]);
	
	//merubah dimensi utk menyesuaiakan sesuai model input 
	const images = images_temp.reshape([batchSize, 28, 28, 1]); 
	//reshape ke btk model input (jum batch, h,w, channel/rgb/greyscale)
		
	//convert batch of labels 
	const labels = tf.tensor2d(batchLabels, [batchSize, this.NUM_CLASSES]);

	return {images, labels}; //mereturn data gambar & label dlm btk tensor 
};
