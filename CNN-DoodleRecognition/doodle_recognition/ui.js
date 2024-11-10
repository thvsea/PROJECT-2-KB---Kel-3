var UI = function(main){
	this.main = main;
	
	//objek game
	var game = this.main.game;
	
	//untuk buat button responsive
	this.btnTrain = game.add.button(460, 625, 'btnTrain', this.onTrainClick, this); //add (posX,posY, namaFile)
	this.btnTest = game.add.button(652, 625, 'btnTest', this.onTestClick, this);
	this.btnClear = game.add.button(842, 625, 'btnClear', this.onClearClick, this);
   
	//bitmap untuk grafik akurasi
	this.bmpAccuChart = game.add.bitmapData(350, 250);
	this.bmpAccuChart.addToWorld(45, 95);
	
	//bitmap untuk grafik loss selama training cnn
	this.bmpLossChart = game.add.bitmapData(350, 250);
	this.bmpLossChart.addToWorld(45, 410);
	
	//bitmap untuk menampilkan semua gambar sampel yang akan diprediksi
	this.bmpSampleImages = game.add.bitmapData(28, (28+4) * App.NUM_SAMPLES);
	this.bmpSampleImages.addToWorld(470, 95);
	 
	//bitmap untuk menggambar kotak abuabu atau merah sebagai hasil prediksi
	this.bmpSampleResults = game.add.bitmapData(125, (28+4) * App.NUM_SAMPLES); //28 tinggi gambar, 4 itu jarak antar gambar
	this.bmpSampleResults.addToWorld(665, 95);
	 
	//membuat objek teks
	this.txtSampleClasses = []; //array untuk menyimpan teks yang menunjukkan kelas benar untuk tiap sampel
	this.txtSamplePredictions = []; //array untuk menyimpan teks yang menunjukkan prediksi untuk tiap sampel

	//for loop untuk menempatkan teks yang menampilkan kelas benar dan prediksi
	for (var i=0; i<App.NUM_SAMPLES; i++){
	 var y = 100 + i*32; //32 = jarak vertikal antar teks
	  
	 this.txtSampleClasses.push(
	  game.add.bitmapText(550, y, "fntBlackChars", "", 18) //nama face = fntBlackChars
	 );
	 
	 this.txtSamplePredictions.push(
	  game.add.bitmapText(670, y, "fntBlackChars", "", 18)
	 );
	}
	 
	//membuat teks untuk menampilkan pesan status 
	this.txtStatBar = game.add.bitmapText(10, 695, "fntBlackChars", "", 18);
	
	//membuat teks prediksi doodle 
	this.txtDoodlePrediction = game.add.bitmapText(1050, 572, "fntBlackChars", "", 36);
	this.txtDoodlePrediction.anchor.setTo(0.5);
   };
   
   //untuk disable button
   UI.prototype.disableButtons = function(){
	this.btnTrain.kill();
	this.btnTest.kill();
	this.btnClear.kill();
   };
   
   //untuk enable button
   UI.prototype.enableButtons = function(){
	this.btnTrain.revive();
	this.btnTest.revive();
	this.btnClear.revive();
   };
   
   //trigger ketika klik train now
   UI.prototype.onTrainClick = function(){
	if (this.main.mode == this.main.MODE_DRAW){
	 this.main.mode = this.main.MODE_CLICK_ON_TRAIN;
	}
   };
   
   //trigger ketike klik MORE
   UI.prototype.onTestClick = function(){
	if (this.main.mode == this.main.MODE_DRAW){
	 this.main.mode = this.main.MODE_CLICK_ON_TEST;
	}
   };
   
   //trigger ketika klik clear
   UI.prototype.onClearClick = function(){
	if (this.main.mode == this.main.MODE_DRAW){
	 this.main.mode = this.main.MODE_CLICK_ON_CLEAR;
	}
   };

   /**
   * @param {Phaser.BitmapData} bmpChart - objek untuk menggambar grafik
   * @param {float Array} aValues - array berisi nilai yang akan diplot pada sumbu y
   * @param {integer} dx - jarak antar dua titik pada sumbu x
   */ 
  //untuk gambar grafik
   UI.prototype.plotChart = function(bmpChart, aValues, dx){
	bmpChart.clear(); //hapus semua konten dari bitmap, agar dapat menggambar baru tanpa ada sisa grafik dari sebelumnya
	
	//for loop untuk menggambar garis dari setiap titik ke titik berikutnya berdasarkan nilai dalam array aValues
	for (var i = 1; i < aValues.length; i++){
	 //kondisi x dan y dari titik awal
	 var x1 = (i-1) * dx;
	 var y1 = bmpChart.height * aValues[i-1];
	 
	 //kondisi titik x dan y dari titik akhir
	 var x2 = i * dx;
	 var y2 = bmpChart.height * aValues[i];
	 
	 bmpChart.line(x1, y1, x2, y2, '#6661BC', 2); //gambar garis dari hasil x y, wrn garis ungu, ketebalan garis 2
	}
   };
   
   //fungsi untuk menggambar semua sampel gambar yang akan diprediksi
   UI.prototype.drawSampleImages = function(){
	this.bmpSampleImages.clear(); //hapus semua konten dari bitmap, agar dapat menggambar baru tanpa ada sisa gambar dari sebelumnya
	
	//mendapatkan referensi ke elemen sampel pertama dalam array yang akan digambar
	var sample = this.main.cnn.testElement;
	
	//untuk semua sampel, update referensi ke sampel berikutnya
	for (var n = 0; n < App.NUM_SAMPLES; n++){
	 sample = (sample + 1) % this.main.cnn.aTestIndices.length;
	 
	 var index = this.main.cnn.aTestIndices[sample]; //untuk dapat indeks dari sampel saat ini
	 var start = index * this.main.cnn.IMAGE_SIZE; //hitung posisi awal dari piksel pertama sampel dalam array gambar aTestImages
	
	 for (var i = 0; i < this.main.cnn.IMAGE_SIZE; i++) {
	  //untuk semua piksel dalam sampel, untuk mendapatkan nilai piksel dari array gambar aTestImages dengan offset start
	  var pixel = this.main.cnn.aTestImages[i + start];
   
	  //untuk menghitung nilai grayscale piksel ini, dihitung dengan konversi nilai piksel ke 0-255 dan kemudian dibalik jadi 255-nilai
	  var grayValue = 255 - ((pixel * 255) >> 0) & 0xFF;
	  
	  //untuk menghitung nilai transparansi piksel, klo greyValue 255 (white), maka alpha jd 0. klo ga 255, alpha diatur ke 255
	  var alpha = (grayValue === 255) ? 0 : 255;
	 
	  var x = i % 28; //menghitung posisi x dari pixel dalam sampel 28x28
	  var y = (i / 28) >> 0; //menghitung posisi y dari pixel dalam sampel 28x28
	 
	  //mengatur nilai pixel pada bitmap dengan posisi yang dihitung dan nilai alpha yang ditentukan
	  this.bmpSampleImages.setPixel32(x, y + n * 32, grayValue, grayValue, grayValue, alpha, false);
	  //x itu x, y + n*32(offset) itu y, grayvalue nilai grayscale untuk rgb, alpha nilai transparansi, false tidak update bitmap lgsg (update ditunda)
	 }
	 
	}
	
	//menampilkan gambar yang telah dimodif pada bitmap this.bmpSampleImages
	this.bmpSampleImages.context.putImageData(this.bmpSampleImages.imageData, 0, 0);
   };
   
   /**
   * @param {integer Array} aClassifications 
   * - array yang berisi indeks dari kelas-kelas yang benar dari sampel-sampel
   *
   * @param {integer Array} aPredictions 
   * - array yang berisi indeks dari kelas-kelas yang diprediksi untuk sampel-sampel
   */
  //menampilkan prediksi sample bersama dengan kotak putib/merah
   UI.prototype.showSamplePredictions = function(aClassifications, aPredictions){
	this.bmpSampleResults.clear();
	//hapus semua konten dari bitmap, agar dapat menggambar baru tanpa ada sisa gambar dari sebelumnya
	  
	//Loop melalui semua klasifikasi yang diberikan
	for (var i=0; i<aClassifications.length; i++){
	 //Set teks kelas benar dari sampel ini
	 this.txtSampleClasses[i].text = App.DATASETS[aClassifications[i]];
	 
	 //Set teks kelas prediksi dari sampel ini
	 this.txtSamplePredictions[i].text = App.DATASETS[aPredictions[i]];
	   
	 //Jika klasifikasi sama dengan prediksi, maka gambar kotak hijau, jika tidak gambar kotak merah
	 var color = (this.txtSampleClasses[i].text === this.txtSamplePredictions[i].text) ? '#EBFFED' : '#FFD7CD'; //wrn benar/salah
	 
	 //Menggambar kotak dengan warna yang telah ditentukan pada posisi yang sesuai
	 this.bmpSampleResults.rect(0, 4 + i*32, this.bmpSampleResults.width-8, 20, color); //posx,y, h,w, wrn
	}
   };
   
   /**
   * @param {integer Array} aPredictions 
   * - Array yang berisi satu elemen yang menunjuk ke kelas prediksi dari gambar doodle
   */
  //menampilkan prediksi sample setelah user menggambar
   UI.prototype.showDoodlePrediction = function(aPredictions){
	this.txtDoodlePrediction.text = "It's "  + App.DATASETS[aPredictions[0]] + ".";
   }; //Mengatur teks dari elemen txtDoodlePrediction untuk menampilkan kelas prediksi dari gambar doodle
   //Mengambil kelas prediksi dari aPredictions[0].
   //Menggunakan nilai ini untuk mengakses nama kelas dari App.DATASETS
   //Menggabungkan teks "It's " dengan nama kelas yang diambil dan titik (".") untuk membentuk kalimat yang lengkap
   
   /**
   * @param {String} strText - String yang berisi teks yang akan ditampilkan di status bar
   */
   UI.prototype.showStatusBar = function(strText){
	this.txtStatBar.text = strText; //Teks yang diterima sebagai parameter strText langsung diatur sebagai konten teks dari elemen txtStatBar
   };
   