import { useEffect, useState, useRef } from 'react'
import axios from 'axios';
import * as bootstrap from 'bootstrap'
import './assets/style.css'


const API_BASE = import.meta.env.VITE_API_BASE;
const API_PATH = import.meta.env.VITE_API_PATH;
//因為產品資料內容都相同，故抽出共用
const initailTempProduct = {
  id: "",
  title: "",
  category: "",
  origin_price: "",
  price: "",
  unit: "",
  description: "",
  content: "",
  is_enabled: false,
  imageUrl: "",
  imagesUrl: [],
};
function App() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [isAuth, setIsAuth] = useState(false);
  const [products, setProducts] = useState([]);
  const [tempProduct, setTempProduct] = useState(initailTempProduct);
  const [modalType, setModalType] = useState('');

  const productModalRef = useRef(null);

  const handleInputChage = (e) => {
    const {name, value} = e.target;
    //console.log(name, value);
    setFormData((preData) => ({
      ...preData, [name]:value,
    }))
  }
  const handleModalInputChange = (e) =>{
    const {name, value, checked, type} = e.target;
    setTempProduct((preData) => ({
      ...preData,
      [name]: type==='checkbox' ? checked : value,
    }))
  }   //因modal input與前一週登入input概念相同，可直接套過來修改

  const handleModalImageChange = (index, value) => {
    setTempProduct((pre)=>{
      const newImages = [...pre.imagesUrl];
      newImages[index] = value;

      //優化邏輯
      //新增部分(輸入連結完後會自動新增輸入框，不須按新增按鈕)
      if(value!=="" && index === newImages.length-1 && newImages.length < 5) {
        newImages.push("");
      }
      //刪除部分
      if(value === "" && newImages.length > 1 && newImages[newImages.length-1] === ""){
        newImages.pop();
      }

      return {
        ...pre,
        imagesUrl: newImages,
      }
    })
  }
  const handleAddImage = () =>{
    setTempProduct((pre) => {
      const newImages = [...pre.imagesUrl];
      //圖片網址輸入為空時不新增
      if(newImages[newImages.length-1] === ""){
        return pre;
      }
      newImages.push("");
      return {
        ...pre, 
        imagesUrl: newImages,
      }
    })
  }
  const handleDeleteImage = () => {
    setTempProduct((pre) => {
      const newImages = [...pre.imagesUrl];
      newImages.pop();
      return {
        ...pre,
        imagesUrl: newImages,
      }
    })
  }
  //更新產品
  const updateProduct = async (id) => {
    let url=`${API_BASE}/api/${API_PATH}/admin/product`;
    let method = 'post';
    if(modalType === 'edit') {
      url=`${API_BASE}/api/${API_PATH}/admin/product/${id}`;
      method = 'put';
    }
    const productData = {
      data:{
        ...tempProduct,
        origin_price : Number(tempProduct.origin_price),   //因為取得資料為字串須轉為API規定格式
        price : Number(tempProduct.price),
        is_enabled : tempProduct.is_enabled === true ? 1 : 0,
        imagesUrl: [...tempProduct.imagesUrl.filter((url => url !== ""))], //防呆網址為空
      }
    }
    try {
      const response = await axios[method](url, productData);
      console.log(response.data);
      //成功取得API後須取得新資料及將modal關閉
      getProducts();
      closeModal();
    } catch (error) {
      alert(`新增產品失敗訊息: ${error.response.data.message}`);
    }
  }
  //刪除產品
  const delProduct = async(id) => {
    try {
      const response = await axios.delete(`${API_BASE}/api/${API_PATH}/admin/product/${id}`);
      console.log(response);
      getProducts();
      closeModal();
    } catch (error) {
      alert(`刪除失敗訊息: ${error.response.data.message}`);
    }    
  }


  //處理登入
  const onSubmit = async(e) => {
    try {
      e.preventDefault();
      const response = await axios.post(`${API_BASE}/admin/signin`, formData)
      //console.log(response)
      //設定cookie
      const {token, expired}=response.data;
      document.cookie = `userToken=${token};expires=${new Date(expired)};`;
      //設定 Authorization Header
      axios.defaults.headers.common['Authorization'] = token;
      //設定畫面
      setIsAuth(true);
      getProducts();  //登入就會取得產品列表，故需呼叫getProducts
    } catch (error) {
      setIsAuth(false);
      alert(`登入失敗訊息:${error.response.data.error.message}`)
    }
  }

  const getProducts = async() => {
    try {
      const response = await axios.get(`${API_BASE}/api/${API_PATH}/admin/products`)
      setProducts(response.data.products)
    } catch (error) {
      alert(`商品取得失敗訊息: ${error.response.data.message}`)
    }
  }
  useEffect(() => {
    const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("userToken="))
    ?.split("=")[1];
    //確定取得tokon後才將token放到header
    if(token) {
      axios.defaults.headers.common['Authorization'] = token;
    }

    //畫面好後才做綁modal DoM元素
    productModalRef.current = new bootstrap.Modal("#productModal", {
      keyboard: false,
    });

    //處理登入驗證
    const checkLogin = async() => {
      try {
        const response = await axios.post(`${API_BASE}/api/user/check`)
        console.log(response);
        //驗證成功後要做的事:畫面狀態改為登入、取得產品
        setIsAuth(true);
        getProducts();
      } catch (error) {
        console.log(error);
        alert(`登入失敗訊息:${error.response.data.message}`)
      }
    }    
    checkLogin(); //呼叫函式驗證登入
  },[]);

  //建立modal打開和關閉方法
  const openModal = (type, product) => {
    //console.log(product);   //確認點擊有取得產品資訊
    setModalType(type);
    setTempProduct((pre) => ({
      ...pre,
      ...product,
    }));
    productModalRef.current.show();
  }
  const closeModal = () => {
    productModalRef.current.hide();
  }

  
  return (
    <>
      {!isAuth ? (
        <div className="container login">
          <h1 className="mb-3">請先登入</h1>
          <form className="form-floating" onSubmit={(e)=>onSubmit(e)}> 
            <div className="form-floating mb-3">
              <input type="email"className="form-control" id="email" name="username" placeholder="name@example.com" value={formData.username} onChange={(e) => handleInputChage(e)}/>
              <label htmlFor="floatingInput">Email address</label>
            </div>
            <div className="form-floating">
              <input type="password" className="form-control" id="password" name="password" placeholder="Password" value={formData.password} onChange={(e) => handleInputChage(e)}/>
              <label htmlFor="floatingPassword">Password</label>
            </div>
            <button type="submit" className='btn btn-primary mt-3 w-100'>登入</button>        
          </form>
        </div>
      ) : (
        <div className="container">         
          <div className="row mt-5">
            <h2>產品列表</h2>
            <div className='text-end mb-3'>
              <button type="button" className='btn btn-primary' onClick={() => openModal("create", initailTempProduct)}>
                建立新的產品
              </button>              
            </div>              
                           
            <table className="table">
              <thead>
                <tr>
                  <th>分類</th>
                  <th>產品名稱</th>
                  <th>原價</th>
                  <th>售價</th>
                  <th>是否啟用</th>
                  <th>編輯</th>
                </tr>
              </thead>
              <tbody>
                {products && products.length > 0 ? (
                  products.map((item) => (
                    <tr key={item.id}>
                      <td>{item.category}</td>
                      <td>{item.title}</td>
                      <td>{item.origin_price}</td>
                      <td>{item.price}</td>
                      <td className={`${item.is_enabled ? 'text-success' : 'text-secondary'} fw-bold`}>{item.is_enabled ? "啟用" : "未啟用"}</td>
                      <td>
                        <div className="btn-group" role="group" aria-label="Basic outlined example">
                          <button type="button" className="btn btn-outline-primary btn-sm" onClick={()=> openModal("edit", item)}>編輯</button>   {/*此處要傳產品內容，所以對應的產品參數是map傳遞的參數item*/}
                          <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => openModal("delete", item)}>刪除</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">尚無產品資料</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>                            
        </div>
      )}

      {/*modal部分，因為不是在登入和列表頁面內，故放在外面，要不然會導致畫面邏輯錯誤*/}
      <div className="modal fade" id="productModal" tabIndex="-1" aria-labelledby="productModalLabel" aria-hidden="true" ref={productModalRef}>
        <div className="modal-dialog modal-xl">
          <div className="modal-content">
            <div className={`modal-header bg-${modalType === 'delete' ? 'danger' : 'dark'}`}>
              <h1 className="modal-title fs-5 text-white" id="productModalLabel">{modalType === 'delete' ? '刪除' : modalType === 'edit' ? '編輯' : '新增'}產品</h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              { modalType === 'delete' ? (<p className='fs-3 fw-bold'>確定要刪除<span className='text-danger'>{tempProduct.title}</span>嗎?</p>) :
                (<div className='row'>
                  <div className='col-4'>
                    <div>
                      <label htmlFor="imageUrl" className='form-label'>輸入圖片網址</label>
                      <input type="text" id="imageUrl" name="imageUrl" placeholder="請輸入圖片連結" className='form-control mb-3' value={tempProduct.imageUrl} onChange={(e) => handleModalInputChange(e)}/>
                      
                      {tempProduct.imageUrl && <img src={tempProduct.imageUrl} alt="主圖" className='mb-3'/>}                    
                    </div>
                    <div>
                      {tempProduct.imagesUrl.map((item, index) => (
                        <div key={index}>
                          <label htmlFor="imageLink" className='form-label'>輸入圖片網址</label>
                          <input type="text" id="imageLink" name="imageLink" placeholder="請輸入圖片連結" className='form-control mb-3' value={item} onChange={(e) => handleModalImageChange(index, e.target.value)}/>
                          {item &&<img src={item} alt="副圖" className='mb-3'/>}
                        </div>
                      ))}                                                  
                    </div>
                    
                    { tempProduct.imagesUrl.length<5 &&  
                      <button className='btn btn-outline-primary w-100 mb-3' onClick={() => handleAddImage()}>新增圖片</button>
                    }
                                      
                    {tempProduct.imagesUrl.length >=1 && <button className='btn btn-outline-danger w-100' onClick={() => handleDeleteImage()}>刪除圖片</button> }
                                  
                  </div>
                  <div className='col-sm-8'>
                    <div className='mb-4'>
                      <div className='mb-2'>
                        <label htmlFor="title" className='form-label'>標題</label>
                        <input type="text" id="title" name="title" placeholder="請輸入標題" className='form-control' value={tempProduct.title} onChange={(e) => handleModalInputChange(e)}/>                    
                      </div>

                      <div className='d-flex gap-2 mb-2'>
                        <div className='col-6'>
                          <label htmlFor="category" className='form-label'>分類</label>
                          <input type="text" id="category" name="category" placeholder="請輸入分類" className='form-control' value={tempProduct.category} onChange={(e) => handleModalInputChange(e)}/>                                        
                        </div>
                        <div className='col-6'>
                          <label htmlFor="unit" className='form-label'>單位</label>                    
                          <input type="text" id="unit" name="unit" placeholder="請輸入單位" className='form-control' value={tempProduct.unit} onChange={(e) => handleModalInputChange(e)}/>                                           
                        </div>
                      </div>

                      <div className='d-flex gap-2 mb-2'>
                        <div className='col-6'>
                          <label htmlFor="origin_price" className='form-label'>原價</label>
                          <input type="text" id="origin_price" name="origin_price" placeholder="請輸入原價" className='form-control' value={tempProduct.origin_price} onChange={(e) => handleModalInputChange(e)}/>                                       
                        </div>
                        <div className='col-6'>
                          <label htmlFor="price" className='form-label'>售價</label>
                          <input type="text" id="price" name="price" placeholder="請輸入售價" className='form-control' value={tempProduct.price} onChange={(e) => handleModalInputChange(e)}/>                    
                        </div>
                      </div>                    
                    </div>

                    <div className='mb-4'>
                      <div className='mb-2'>
                        <label htmlFor="description" className='form-label'>產品描述</label>
                        <textarea type="text" id="description" name="description" placeholder="請輸入產品描述" className='form-control' value={tempProduct.description} onChange={(e) => handleModalInputChange(e)}/>                   
                      </div>
                      <div className='mb-2'>
                        <label htmlFor="content" className='form-label'>產品說明</label>
                        <textarea type="text" id="content" name="content" placeholder="請輸入產品說明" className='form-control' value={tempProduct.content} onChange={(e) => handleModalInputChange(e)}/>                   
                      </div>                    
                    </div>

                    
                    <div className="form-check d-inline-block">
                      <input className="form-check-input" type="checkbox" value="" id="is_enabled" name="is_enabled" checked={tempProduct.is_enabled} onChange={(e) => handleModalInputChange(e)}/>
                      <label className="form-check-label" htmlFor="is_enabled">
                        是否啟用
                      </label>
                    </div>                                                                        
                                      
                  </div>
                </div>)
              }
              
            </div>
            <div className="modal-footer">
              {modalType === 'delete' ? (<button type="button" className="btn btn-danger" onClick={() => delProduct(tempProduct.id)}>刪除</button>) : (
                <>
                  <button type="button" className="btn btn-outline-primary" data-bs-dismiss="modal" onClick={closeModal}>取消</button>
                  <button type="button" className="btn btn-primary" onClick={() => updateProduct(tempProduct.id)}>確認</button>
                </>
              )}              
            </div>
          </div>
        </div>
      </div>      
    </>
  );
}

export default App
